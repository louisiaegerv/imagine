// Shared by the API routes and the UI. Keep this file free of Node-only imports.

export const REGIONS = ["sidebar", "main"] as const
export type Region = (typeof REGIONS)[number]

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value)
}

export const BLUR_MAX = 40
export const OVERLAY_MAX = 100

export const MAX_BACKGROUND_BYTES = 25 * 1024 * 1024
export const ACCEPTED_BACKGROUND_TYPES = ["image/png", "image/jpeg", "image/webp"]

/**
 * Backgrounds that ship with the app (public/backgrounds/<id>.webp), so they
 * work without uploading anything. Generated with gpt-image-2.5-sunburst.
 */
export const PRESETS = [
  { id: "aurora", name: "Aurora" },
  { id: "dunes", name: "Desert dunes" },
  { id: "forest", name: "Misty forest" },
  { id: "neon", name: "Neon skyline" },
  { id: "waves", name: "Pastel waves" },
] as const

export type PresetId = (typeof PRESETS)[number]["id"]

export function isPresetId(value: string): value is PresetId {
  return PRESETS.some((p) => p.id === value)
}

export const presetUrl = (id: PresetId) => `/backgrounds/${id}.webp`

export type RegionAppearance = {
  /** URL of the uploaded background, or null for the plain theme colour. */
  imageUrl: string | null
  /** Blur radius in px; 0 is sharp. */
  blur: number
  /** Opacity (%) of the theme-coloured layer over the image; 100 hides it. */
  overlay: number
}

export type Appearance = Record<Region, RegionAppearance>

export const DEFAULT_REGION_APPEARANCE: RegionAppearance = {
  imageUrl: null,
  blur: 6,
  overlay: 75,
}

export const DEFAULT_APPEARANCE: Appearance = {
  sidebar: DEFAULT_REGION_APPEARANCE,
  main: DEFAULT_REGION_APPEARANCE,
}
