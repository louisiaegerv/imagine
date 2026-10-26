"use client"

import * as React from "react"

import {
  DEFAULT_APPEARANCE,
  type Appearance,
  type PresetId,
  type Region,
  type RegionAppearance,
} from "@/lib/appearance-config"

type Style = Partial<Pick<RegionAppearance, "blur" | "overlay">>
type Result = { ok: true } | { ok: false; error: string }

type AppearanceContextValue = {
  appearance: Appearance
  /** Applies blur/overlay on screen immediately, without saving (for dragging a slider). */
  preview: (region: Region, style: Style) => void
  /** Applies and saves blur/overlay. */
  save: (region: Region, style: Style) => Promise<void>
  upload: (region: Region, file: File) => Promise<Result>
  choosePreset: (region: Region, id: PresetId) => Promise<Result>
  remove: (region: Region) => Promise<Result>
}

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null)

export function useAppearance() {
  const value = React.useContext(AppearanceContext)
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider")
  return value
}

async function request(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, init)
    const data = await res.json().catch(() => null)
    return res.ok
      ? ({ ok: true, data } as const)
      : ({ ok: false, error: data?.error ?? "Something went wrong" } as const)
  } catch {
    return { ok: false, error: "Couldn't reach the server" } as const
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = React.useState<Appearance>(DEFAULT_APPEARANCE)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/appearance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && data && setAppearance(data))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const setRegion = React.useCallback(
    (region: Region, next: Partial<RegionAppearance>) =>
      setAppearance((a) => ({ ...a, [region]: { ...a[region], ...next } })),
    []
  )

  const value = React.useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      preview: setRegion,
      save: async (region, style) => {
        setRegion(region, style)
        await request(`/api/appearance/${region}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(style),
        })
      },
      upload: async (region, file) => {
        const body = new FormData()
        body.append("image", file)
        const res = await request(`/api/appearance/${region}/image`, {
          method: "POST",
          body,
        })
        if (!res.ok) return res
        setRegion(region, res.data)
        return { ok: true }
      },
      choosePreset: async (region, id) => {
        const res = await request(`/api/appearance/${region}/preset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        if (!res.ok) return res
        setRegion(region, res.data)
        return { ok: true }
      },
      remove: async (region) => {
        const res = await request(`/api/appearance/${region}/image`, {
          method: "DELETE",
        })
        if (!res.ok) return res
        setRegion(region, res.data)
        return { ok: true }
      },
    }),
    [appearance, setRegion]
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
