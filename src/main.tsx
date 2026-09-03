import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Viewport height fix (iOS Safari / Android Chrome with browser chrome) ─────
// 100vh in a browser tab includes the URL bar on some browsers, which causes
// overflow. We calculate the real inner height and expose it as --vh so Layout
// can use calc(var(--vh,1vh)*100) instead of 100vh.
// In standalone PWA mode this equals 100vh exactly, so there's zero downside.
function setVhVar() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setVhVar();
window.addEventListener("resize", setVhVar);
window.addEventListener("orientationchange", () => setTimeout(setVhVar, 200));

// ── Startup reporting ──────────────────────────────────────────────────────────
// The real safety net now lives in index.html as a plain classic script,
// independent of this module — that's what actually catches a Chrome-66-style
// failure, because a classic script keeps running even if THIS file fails to
// parse or throws before reaching this point. This module's only remaining job
// is to tell that outer script "I made it" once React actually starts, and to
// fall back to its own copy of the same message for the handful of cases that
// occur *after* this module is confirmed running (e.g. a later runtime crash
// React's own ErrorBoundary doesn't catch).
function showFatalStartupError(message: string) {
  if ((window as any).__schorahub_react_mounted) return; // React is up; its own ErrorBoundary handles this
  const rootEl = document.getElementById("root");
  if (!rootEl) return;
  rootEl.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;background:#060818;color:#fff;flex-direction:column;text-align:center;' +
    'font-family:system-ui,-apple-system,sans-serif;">' +
    '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#0284c7,#2563eb);' +
    'display:flex;align-items:center;justify-content:center;margin-bottom:20px;' +
    'box-shadow:0 8px 24px rgba(147,51,234,0.35);font-size:26px;">🎓</div>' +
    '<h2 style="font-size:18px;font-weight:800;margin-bottom:10px;letter-spacing:-0.01em;">' +
    'SchoraHub couldn\u2019t start</h2>' +
    '<p style="font-size:13px;color:rgba(255,255,255,0.6);max-width:300px;margin-bottom:20px;line-height:1.6;">' +
    'Please update your browser or use a different browser, then reopen the app.</p>' +
    '<button onclick="window.location.reload()" style="background:linear-gradient(135deg,#0284c7,#2563eb);' +
    'color:#fff;border:none;border-radius:12px;padding:12px 28px;font-weight:700;font-size:14px;' +
    'box-shadow:0 8px 20px rgba(147,51,234,0.3);margin-bottom:24px;">Try Again</button>' +
    '<div style="width:32px;height:1px;background:rgba(255,255,255,0.12);margin-bottom:14px;"></div>' +
    '<p style="font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:0.02em;">SchoraHub Managing Team</p>' +
    '</div>';
}

// A single stray JS error while the page is loading (browser extension,
// blocked tracker, unrelated third-party script) does NOT mean the app
// failed to start — those happen on plenty of working page loads. Reacting
// to them instantly caused a false "couldn't start" flash right before the
// real app finished mounting. So these only log for debugging now; the
// index.html watchdog (which checks whether the app actually confirmed it
// mounted, rather than guessing from one possibly-unrelated event) is the
// only thing that decides whether to show the fallback message.
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled]", e.reason);
});
window.addEventListener("error", (e) => {
  console.error("[GlobalError]", e.message, e.filename, e.lineno);
});

// ── Mount React ────────────────────────────────────────────────────────────────
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("[SchoraHub] #root element not found — check index.html");

if ((window as any).__schorahub_style_unsupported) {
  // Set by the inline check in index.html — this browser can't render our
  // styling correctly (missing color-mix()/oklch()). Don't mount React into
  // broken CSS; show the same clear upgrade message instead.
  showFatalStartupError(
    "Your browser doesn't support some styling features SchoraHub needs. Please update your browser."
  );
} else {
  try {
    createRoot(rootEl).render(<App />);
    // Tell the outer watchdog script (in index.html) that we made it — this
    // stops both its 6-second timer and its error listener from firing a
    // fallback message on top of a perfectly working app.
    (window as any).__schorahub_react_mounted = true;
  } catch (err: any) {
    console.error("[Mount failed]", err);
    showFatalStartupError(err?.message || "Unknown error");
  }
}

// ── Service Worker ─────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  });
}
