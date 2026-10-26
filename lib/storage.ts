import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { LIBRARY_DIR } from "@/lib/paths"

/** Generated + attached images live here. */
export const IMAGES_DIR = path.join(LIBRARY_DIR, "images")
const OUTPUT_DIR = path.join(IMAGES_DIR, "out")
const INPUT_DIR = path.join(IMAGES_DIR, "inputs")
const BACKGROUND_DIR = path.join(IMAGES_DIR, "backgrounds")

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
}

export async function saveOutputImage(base64: string, ext: string) {
  await mkdir(OUTPUT_DIR, { recursive: true })
  const buffer = Buffer.from(base64, "base64")
  const filename = `${crypto.randomUUID()}.${ext}`
  await writeFile(path.join(OUTPUT_DIR, filename), buffer)
  return { relPath: `out/${filename}`, bytes: buffer.byteLength }
}

export async function saveInputImage(file: File) {
  await mkdir(INPUT_DIR, { recursive: true })
  const ext = EXT_BY_TYPE[file.type] ?? "png"
  const filename = `${crypto.randomUUID()}.${ext}`
  await writeFile(
    path.join(INPUT_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  )
  return `inputs/${filename}`
}

/** Saves an already-processed WebP background and returns its library-relative path. */
export async function saveBackgroundImage(webp: Buffer) {
  await mkdir(BACKGROUND_DIR, { recursive: true })
  const filename = `${crypto.randomUUID()}.webp`
  await writeFile(path.join(BACKGROUND_DIR, filename), webp)
  return `backgrounds/${filename}`
}

/** Resolves a library-relative path, refusing anything outside IMAGES_DIR. */
function resolveSafe(relPath: string) {
  const full = path.resolve(IMAGES_DIR, relPath)
  if (!full.startsWith(IMAGES_DIR + path.sep)) return null
  return full
}

export async function readImageFile(relPath: string) {
  const full = resolveSafe(relPath)
  if (!full) return null
  const ext = path.extname(full).slice(1).toLowerCase()
  const type = TYPE_BY_EXT[ext]
  if (!type) return null
  try {
    return { data: await readFile(full), type }
  } catch {
    return null
  }
}

export async function deleteImageFile(relPath: string) {
  const full = resolveSafe(relPath)
  if (!full) return
  await unlink(full).catch(() => {})
}

export function mediaUrl(relPath: string) {
  return `/api/media/${relPath}`
}
