// Google sign-in removed — users are identified anonymously via localStorage UUID.
// Theme helpers kept unchanged.

const THEME_KEY = "schorahub_theme";

export function getTheme(): "light" | "dark" {
  return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
