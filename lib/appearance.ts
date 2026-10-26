import sharp from "sharp"

import {
  BLUR_MAX,
  DEFAULT_REGION_APPEARANCE,
  OVERLAY_MAX,
  REGIONS,
  isPresetId,
  presetUrl,
  type Appearance,
  type PresetId,
  type Region,
  type RegionAppearance,
} from "@/lib/appearance-config"
import { getDb } from "@/lib/db"
import { deleteImageFile, mediaUrl, saveBackgroundImage } from "@/lib/storage"

// Backgrounds are downscaled so a 20 MP photo doesn't weigh down every page load.
const MAX_EDGE = 2560

type Stored = Record<
  Region,
  { image: string | null; blur: number; overlay: number }
>

const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.min(Math.max(Math.round(n), min), max)
    : fallback

function readStored(): Stored {
  const db = getDb()
  // Created here rather than in the shared schema so an already-running dev
  // server picks it up without a restart.
  db.exec(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
  )
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'appearance'")
    .get() as { value: string } | undefined

  let parsed: Partial<Record<Region, Partial<Stored[Region]>>> = {}
  try {
    parsed = row ? JSON.parse(row.value) : {}
  } catch {}

  const stored = {} as Stored
  for (const region of REGIONS) {
    const r = parsed[region] ?? {}
    stored[region] = {
      image: typeof r.image === "string" ? r.image : null,
      blur: clamp(r.blur, 0, BLUR_MAX, DEFAULT_REGION_APPEARANCE.blur),
      overlay: clamp(r.overlay, 0, OVERLAY_MAX, DEFAULT_REGION_APPEARANCE.overlay),
    }
  }
  return stored
}

function writeStored(stored: Stored) {
  getDb()
    .prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('appearance', ?)"
    )
    .run(JSON.stringify(stored))
}

// A stored background is either "preset:<id>" (bundled with the app) or the
// library path of an uploaded file.
const PRESET_PREFIX = "preset:"
const isUpload = (image: string | null): image is string =>
  !!image && !image.startsWith(PRESET_PREFIX)

function imageUrl(image: string | null) {
  if (!image) return null
  if (!image.startsWith(PRESET_PREFIX)) return mediaUrl(image)
  const id = image.slice(PRESET_PREFIX.length)
  return isPresetId(id) ? presetUrl(id) : null
}

function toRegion(s: Stored[Region]): RegionAppearance {
  return {
    imageUrl: imageUrl(s.image),
    blur: s.blur,
    overlay: s.overlay,
  }
}

export function getAppearance(): Appearance {
  const stored = readStored()
  return {
    sidebar: toRegion(stored.sidebar),
    main: toRegion(stored.main),
  }
}

export function updateStyle(
  region: Region,
  patch: { blur?: number; overlay?: number }
) {
  const stored = readStored()
  if (patch.blur !== undefined) stored[region].blur = patch.blur
  if (patch.overlay !== undefined) stored[region].overlay = patch.overlay
  writeStored(stored)
  return toRegion(stored[region])
}

/** Resizes, saves and activates a background; the previous file is deleted. */
export async function setBackground(region: Region, file: File) {
  const bytes = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate() // apply EXIF orientation so phone photos aren't sideways
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()
  const relPath = await saveBackgroundImage(bytes)

  const stored = readStored()
  const previous = stored[region].image
  stored[region].image = relPath
  writeStored(stored)
  if (isUpload(previous)) await deleteImageFile(previous)
  return toRegion(stored[region])
}

/** Switches a region to one of the bundled backgrounds. */
export async function setPreset(region: Region, id: PresetId) {
  const stored = readStored()
  const previous = stored[region].image
  stored[region].image = PRESET_PREFIX + id
  writeStored(stored)
  if (isUpload(previous)) await deleteImageFile(previous)
  return toRegion(stored[region])
}

export async function clearBackground(region: Region) {
  const stored = readStored()
  const previous = stored[region].image
  stored[region].image = null
  writeStored(stored)
  if (isUpload(previous)) await deleteImageFile(previous)
  return toRegion(stored[region])
}
