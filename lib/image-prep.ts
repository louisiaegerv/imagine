import sharp from "sharp"

// OpenAI bills input images by pixel count, so a 4000x3000 phone photo costs
// far more than a 1024px copy of it, with no benefit to the result. We shrink
// only the copy sent to the API; the original is kept as uploaded.

export type PreparedImage = { bytes: Uint8Array; mime: string }

const DEFAULT_MAX_EDGE = 512
const MIN_MAX_EDGE = 64

/**
 * Longest edge (px) for images sent to OpenAI. Set IMAGE_INPUT_MAX_EDGE to
 * change it, or to 0 to send originals untouched. Values under 64 are ignored.
 */
export function inputMaxEdge() {
  const parsed = Number.parseInt(process.env.IMAGE_INPUT_MAX_EDGE ?? "", 10)
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_EDGE
  if (parsed === 0) return 0
  return parsed < MIN_MAX_EDGE ? DEFAULT_MAX_EDGE : parsed
}

/**
 * Downscales to fit within maxEdge x maxEdge (keeping aspect ratio, never
 * upscaling) and re-encodes as WebP. Returns the original when it is already
 * small enough, or if anything goes wrong: the worst case is paying more,
 * never a failed request.
 */
export async function shrinkForModel(
  image: PreparedImage,
  maxEdge = inputMaxEdge()
): Promise<PreparedImage> {
  if (maxEdge <= 0) return image
  try {
    const meta = await sharp(image.bytes).metadata()
    if (!meta.width || !meta.height) return image

    // A rotated image (EXIF orientation > 1) is re-encoded even when small, so
    // the upright pixels are what get sent. Rotation never changes the longest edge.
    const orientation = meta.orientation ?? 1
    const longest = Math.max(meta.width, meta.height)
    if (longest <= maxEdge && orientation === 1) return image

    const bytes = await sharp(image.bytes)
      .rotate() // apply EXIF orientation before resizing, or phone photos end up sideways
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer()
    return { bytes: new Uint8Array(bytes), mime: "image/webp" }
  } catch {
    return image
  }
}
