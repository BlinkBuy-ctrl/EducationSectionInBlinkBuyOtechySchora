import { useState, useEffect, useRef } from "react";
import { X, Download, GraduationCap } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

// Store the event at module level — this way it's captured even if it fires
// before React mounts (which is almost always the case in Vite PWAs)
let _deferredPrompt: any = null;
let _installed = false;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredPrompt = e;
  window.dispatchEvent(new Event("schorahub:installready"));
});

window.addEventListener("appinstalled", () => {
  _installed = true;
  _deferredPrompt = null;
  window.dispatchEvent(new Event("schorahub:installed"));
});

/**
 * Shared helpers so OTHER components (e.g. the "Install App" button in
 * Settings) can trigger the exact same captured install prompt instead of
 * registering a second `beforeinstallprompt` listener, which could cause
 * conflicts since the browser event can only be consumed once.
 */
export function isAppInstalled(): boolean {
  if (_installed) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable" | "already-installed";

export async function triggerInstallPrompt(): Promise<InstallOutcome> {
  if (isAppInstalled()) return "already-installed";
  if (!_deferredPrompt) return "unavailable";

  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  _deferredPrompt = null;
  if (outcome === "accepted") {
    _installed = true;
    window.dispatchEvent(new Event("schorahub:installed"));
  }
  return outcome === "accepted" ? "accepted" : "dismissed";
}

/**
 * beforeinstallprompt only fires on Chromium browsers (Chrome, Edge, Samsung
 * Internet, Opera, Brave). Firefox and Safari never fire it, so this app
 * previously fell back to either the iOS "Share > Add to Home Screen" copy,
 * or — for anyone else, including Firefox — silence (no button ever appears,
 * since `prompt` stays null and the buttons only render for !isIOS assuming
 * a captured prompt will eventually exist). This detects each browser family
 * and shows the correct manual steps instead of assuming Chromium.
 */
type BrowserKind = "chromium" | "ios-safari" | "firefox-android" | "firefox-desktop" | "other";

function detectBrowser(): BrowserKind {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isFirefox = /firefox|fxios/.test(ua);
  const isAndroid = /android/.test(ua);

  if (isIOS) return "ios-safari";
  if (isFirefox && isAndroid) return "firefox-android";
  if (isFirefox) return "firefox-desktop";
  if (_deferredPrompt || /chrome|chromium|crios|edg|samsungbrowser|opr\//.test(ua)) return "chromium";
  return "other";
}

export function InstallPrompt() {
  const [prompt, setPrompt]     = useState<any>(() => _deferredPrompt);
  const [visible, setVisible]   = useState(false);
  const [hiding, setHiding]     = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone) return;

    const dismissed = safeGetItem("otechy_install_dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    const show = () => {
      timerRef.current = setTimeout(() => setVisible(true), 2500);
    };

    const browser = detectBrowser();

    if (_deferredPrompt) {
      setPrompt(_deferredPrompt);
      show();
    }

    const onReady = () => {
      setPrompt(_deferredPrompt);
      show();
    };
    window.addEventListener("schorahub:installready", onReady);

    // Chromium browsers wait for the real beforeinstallprompt event (handled
    // above / by onReady). Every other browser family has no such event, so
    // show our own card immediately instead of waiting forever for an event
    // that will never fire.
    if (browser !== "chromium") show();

    const onInstalled = () => setVisible(false);
    window.addEventListener("schorahub:installed", onInstalled);

    return () => {
      window.removeEventListener("schorahub:installready", onReady);
      window.removeEventListener("schorahub:installed", onInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (isStandalone) return null;
  if (!visible) return null;

  const browser = detectBrowser();
  // Chromium counts as "has a real one-tap install" only once the native
  // prompt has actually been captured by the browser event.
  const hasNativePrompt = browser === "chromium" && !!prompt;

  const dismiss = () => {
    setHiding(true);
    setTimeout(() => setVisible(false), 400);
    safeSetItem("otechy_install_dismissed", String(Date.now()));
  };

  const install = async () => {
    if (hasNativePrompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      _deferredPrompt = null;
      if (outcome === "accepted") {
        setVisible(false);
        return;
      }
      dismiss();
      return;
    }
    // No browser API can trigger install here — show the exact steps
    // instead of a button that would otherwise do nothing.
    setShowSteps(true);
  };

  const subtitle: Record<BrowserKind, string> = {
    "ios-safari": "Add to your home screen for fast access — works offline too!",
    "firefox-android": "Add to your home screen for fast access — works offline too!",
    "firefox-desktop": "Set up quick access to SchoraHub in a couple of taps.",
    "chromium": "Add to your home screen for fast access — works offline too!",
    "other": "Add to your home screen for fast access — works offline too!",
  };

  const steps: Record<BrowserKind, string[]> = {
    "ios-safari": [
      'Tap the Share icon in Safari\u2019s toolbar.',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" in the top-right corner.',
    ],
    "firefox-android": [
      "Tap the menu (⋮) in the top-right of Firefox.",
      'Tap "Install" (or "Add to Home screen").',
      "Confirm — SchoraHub will appear on your home screen.",
    ],
    "firefox-desktop": [
      "Desktop Firefox doesn't support one-tap app install yet.",
      "Press Ctrl/Cmd+D to bookmark this page for quick access instead,",
      "or open this link in Chrome/Edge to install it as an app.",
    ],
    "chromium": [
      "Tap the menu (⋮ or ...) in your browser.",
      'Tap "Install app" or "Add to Home screen".',
      "Confirm to finish installing.",
    ],
    "other": [
      "Open your browser's menu.",
      'Look for "Add to Home Screen" or "Install App".',
      "Confirm to finish installing.",
    ],
  };

  return (
    <>
      <div
        className="fixed left-3 right-3 z-[9990]"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          opacity: hiding ? 0 : 1,
          transform: hiding ? "translateY(20px)" : "translateY(0)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <div className="bg-[#0f1428] border border-sky-500/40 rounded-2xl shadow-2xl shadow-sky-900/40 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-sky-500 to-blue-500" />

          <div className="p-4 flex gap-3 items-start">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">Install SchoraHub</p>
              <p className="text-white/55 text-xs mt-0.5 leading-relaxed">
                {subtitle[browser]}
              </p>
            </div>

            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/50 shrink-0 active:scale-90 transition-transform"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 rounded-xl border border-white/15 text-white/60 text-xs font-semibold active:scale-95 transition-all"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-sky-500/30"
            >
              <Download className="w-3.5 h-3.5" /> Install App
            </button>
          </div>
        </div>
      </div>

      {showSteps && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSteps(false)}
        >
          <div
            className="bg-[#0f1428] border border-sky-500/40 rounded-2xl shadow-2xl shadow-sky-900/40 overflow-hidden w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-0.5 bg-gradient-to-r from-sky-500 to-blue-500" />
            <div className="p-5">
              <p className="text-white font-black text-sm mb-3">Install SchoraHub</p>
              <ol className="space-y-2 mb-4">
                {steps[browser].map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-white/70 text-xs leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-sky-600/30 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => { setShowSteps(false); dismiss(); }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-sky-500/30"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
