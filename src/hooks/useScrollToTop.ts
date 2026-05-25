import { useEffect } from "react"
import { useLocation } from "wouter"

export function useScrollToTop() {
  const [loc] = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [loc])
}
