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

// ── Global safety nets ─────────────────────────────────────────────────────────
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled]", e.reason);
  e.preventDefault();
});
window.addEventListener("error", (e) => {
  console.error("[GlobalError]", e.message, e.filename, e.lineno);
});

// ── Mount React ────────────────────────────────────────────────────────────────
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("[SchoraHub] #root element not found — check index.html");
createRoot(rootEl).render(<App />);

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
