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
