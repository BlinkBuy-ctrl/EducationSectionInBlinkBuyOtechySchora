import { useState, useEffect } from "react"
import { getTheme, setTheme as persistTheme } from "@/lib/auth"

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light")

  useEffect(() => {
    const saved = getTheme()
    setThemeState(saved)
    document.documentElement.classList.toggle("dark", saved === "dark")
  }, [])

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setThemeState(next)
    persistTheme(next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return { theme, toggleTheme }
}
