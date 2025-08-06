"use client"
import { applyThemeToElement } from "@/components/features/themes/apply-theme"
import { useThemeStore } from "@/components/features/themes/theme-store"
import { useEffect, useState } from "react"

type ThemeProviderProps = {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themeState } = useThemeStore()
  const [isClient, setIsClient] = useState(false)

  // Handle hydration and initialize CSS transitions
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const root = document.documentElement
    if (!root) return

    applyThemeToElement(themeState, root)
  }, [themeState, isClient])

  return <>{children}</>
}