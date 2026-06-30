// Google sign-in removed — users are identified anonymously via localStorage UUID.
// Theme helpers kept unchanged in behavior, now storage-safe.

import { safeGetItem, safeSetItem } from "@/lib/storage";

const THEME_KEY = "otechyschora_theme";

export function getTheme(): "light" | "dark" {
  return (safeGetItem(THEME_KEY) as "light" | "dark") || "light";
}

export function setTheme(theme: "light" | "dark") {
  safeSetItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
