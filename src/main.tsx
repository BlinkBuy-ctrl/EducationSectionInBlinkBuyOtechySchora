import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global safety net — catch unhandled promise rejections (e.g. Supabase offline)
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled]", e.reason);
  e.preventDefault();
});

// Global JS error trap — logs crashes that would otherwise be silent on mobile
window.addEventListener("error", (e) => {
  console.error("[GlobalError]", e.message, e.filename, e.lineno);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("[SchoraHub] #root element not found — check index.html");
}

createRoot(rootEl).render(<App />);

// Register the service worker.
// Previously the SW file existed at public/sw.js but was NEVER registered,
// meaning the PWA had no offline support and the install prompt was misleading.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);

        // When a new SW is waiting, activate it immediately so the user
        // always gets the latest build without needing a manual reload.
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
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  });
}
