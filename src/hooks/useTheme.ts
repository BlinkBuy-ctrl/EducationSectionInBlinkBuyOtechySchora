import { useState } from "react"
import { getTheme, setTheme as persistTheme } from "@/lib/auth"

export function useTheme() {
  // Initialize synchronously so the correct class is applied BEFORE first paint.
  // Previously this was done in useEffect, which caused a white flash on PWA launch
  // because the app briefly rendered in light mode before the saved theme was applied.
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const saved = getTheme()
    document.documentElement.classList.toggle("dark", saved === "dark")
    return saved
  })

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setThemeState(next)
    persistTheme(next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return { theme, toggleTheme }
}
