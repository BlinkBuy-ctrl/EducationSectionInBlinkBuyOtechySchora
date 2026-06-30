import { useState, useEffect, useRef } from "react";
import { X, Download, GraduationCap } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

// Store the event at module level — this way it's captured even if it fires
// before React mounts (which is almost always the case in Vite PWAs)
let _deferredPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredPrompt = e;
  window.dispatchEvent(new Event("schorahub:installready"));
});

export function InstallPrompt() {
  const [prompt, setPrompt]     = useState<any>(() => _deferredPrompt);
  const [visible, setVisible]   = useState(false);
  const [hiding, setHiding]     = useState(false);
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

    if (_deferredPrompt) {
      setPrompt(_deferredPrompt);
      show();
    }

    const onReady = () => {
      setPrompt(_deferredPrompt);
      show();
    };
    window.addEventListener("schorahub:installready", onReady);

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) show();

    return () => {
      window.removeEventListener("schorahub:installready", onReady);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (isStandalone) return null;
  if (!visible) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const dismiss = () => {
    setHiding(true);
    setTimeout(() => setVisible(false), 400);
    safeSetItem("otechy_install_dismissed", String(Date.now()));
  };

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      _deferredPrompt = null;
      if (outcome === "accepted") {
        setVisible(false);
        return;
      }
    }
    dismiss();
  };

  return (
    <div
      className="fixed left-3 right-3 z-[9990]"
      style={{
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        opacity: hiding ? 0 : 1,
        transform: hiding ? "translateY(20px)" : "translateY(0)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      <div className="bg-[#0f1428] border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />

        <div className="p-4 flex gap-3 items-start">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight">Install SchoraHub</p>
            <p className="text-white/55 text-xs mt-0.5 leading-relaxed">
              {isIOS
                ? 'Tap the Share button then "Add to Home Screen" for the full app experience.'
                : "Add to your home screen for fast access — works offline too!"}
            </p>
          </div>

          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/50 shrink-0 active:scale-90 transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isIOS && (
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 rounded-xl border border-white/15 text-white/60 text-xs font-semibold active:scale-95 transition-all"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-purple-500/30"
            >
              <Download className="w-3.5 h-3.5" /> Install App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
