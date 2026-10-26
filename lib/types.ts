import type { Usage } from "@/lib/image-config"

export type GenerationMode = "generate" | "edit"

export type ImageRecord = {
  id: number
  url: string
  /** Absolute path of the image on disk, for tools running on this machine. */
  filePath: string
  width: number
  height: number
  bytes: number
  createdAt: number
  /** Ids of the collections this image belongs to. */
  collectionIds: number[]
  generation: {
    id: string
    prompt: string
    mode: GenerationMode
    model: string
    aspectRatio: string
    size: string
    quality: string
    outputFormat: string
    outputCompression: number
    /** Number of images the API call returned (cost covers all of them). */
    imageCount: number
    inputUrls: string[]
    usage: Usage
    costUsd: number
    durationMs: number
  }
}

export type ImagePage = {
  items: ImageRecord[]
  nextCursor: number | null
}

export type LibraryStats = {
  images: number
  generations: number
  costUsd: number
  tokens: number
}

export type Collection = {
  id: number
  name: string
  imageCount: number
  /** Up to four of the most recently added images, for the cover mosaic. */
  coverUrls: string[]
  createdAt: number
}
