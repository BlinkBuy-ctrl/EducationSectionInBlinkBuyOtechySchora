import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled]", e.reason);
  e.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
