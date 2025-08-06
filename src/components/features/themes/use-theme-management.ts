import {
    type FetchedTheme,
    THEME_URLS,
    type ThemePreset,
    fetchThemeFromUrl
} from "@/components/features/themes/theme-utils"
import { toggleThemeMode } from "@/components/features/themes/toggle-theme-mode"
import { useThemeStore } from "@/components/features/themes/theme-store"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export function useThemeManagement() {
    const { themeState, setThemeState } = useThemeStore()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedThemeUrl, setSelectedThemeUrl] = useState<string | null>(null)
    const [customThemeUrls, setCustomThemeUrls] = useState<string[]>(() => {
        // Optionally, load from localStorage if you want persistence
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("customThemeUrls")
            if (stored) {
                try {
                    return JSON.parse(stored)
                } catch {
                    return []
                }
            }
        }
        return []
    })

    // Helper to persist customThemeUrls to localStorage
    const persistCustomThemeUrls = (urls: string[]) => {
        setCustomThemeUrls(urls)
        if (typeof window !== "undefined") {
            localStorage.setItem("customThemeUrls", JSON.stringify(urls))
        }
    }

    // Combine built-in and user-saved theme URLs (deduplicated)
    const allThemeUrls = useMemo(() => {
        const urlSet = new Set<string>(THEME_URLS)
        customThemeUrls.forEach((url: string) => urlSet.add(url))
        return Array.from(urlSet)
    }, [customThemeUrls])

    const { data: fetchedThemes = [], isLoading: isLoadingThemes } = useQuery({
        queryKey: ["themes", allThemeUrls],
        queryFn: () => Promise.all(allThemeUrls.map(fetchThemeFromUrl)),
        enabled: allThemeUrls.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000 // 10 minutes
    })

    const applyThemePreset = (preset: ThemePreset) => {
        setThemeState({
            currentMode: themeState.currentMode,
            cssVars: preset.cssVars
        })
    }

    const handleThemeImported = (preset: ThemePreset, url: string) => {
        applyThemePreset(preset)
        setSelectedThemeUrl(url)

        if (!THEME_URLS.includes(url) && !customThemeUrls.includes(url)) {
            const updated = [...customThemeUrls, url]
            persistCustomThemeUrls(updated)
            toast.success("Theme imported successfully")
        }
    }

    const handleThemeSelect = (theme: FetchedTheme) => {
        if ("error" in theme && theme.error) {
            return
        }

        if ("preset" in theme) {
            applyThemePreset(theme.preset)
            setSelectedThemeUrl(theme.url)
        }
    }

    const handleThemeDelete = (url: string) => {
        if (THEME_URLS.includes(url)) return
        const updated = customThemeUrls.filter((u) => u !== url)
        persistCustomThemeUrls(updated)
        toast.success("Theme deleted successfully")
    }

    const toggleMode = () => {
        toggleThemeMode()
    }

    const randomizeTheme = () => {
        const availableThemes = fetchedThemes.filter((theme) => !("error" in theme && theme.error))
        if (availableThemes.length > 0) {
            const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]
            handleThemeSelect(randomTheme)
        }
    }

    const filteredThemes = fetchedThemes.filter((theme) =>
        theme.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const customThemes = filteredThemes.filter((theme) => theme.type === "custom")
    const builtInThemes = filteredThemes.filter((theme) => theme.type === "built-in")

    return {
        // State
        themeState,
        searchQuery,
        setSearchQuery,
        selectedThemeUrl,
        setSelectedThemeUrl,
        isLoadingThemes,
        fetchedThemes,
        filteredThemes,
        customThemes,
        builtInThemes,

        // Actions
        handleThemeImported,
        handleThemeSelect,
        handleThemeDelete,
        toggleMode,
        randomizeTheme,
        applyThemePreset,

        // Custom theme URLs for local management
        customThemeUrls,
        setCustomThemeUrls
    }
}