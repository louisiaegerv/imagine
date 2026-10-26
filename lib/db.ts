import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

import type { Usage } from "@/lib/image-config"
import { LIBRARY_DIR } from "@/lib/paths"
import { IMAGES_DIR, deleteImageFile, mediaUrl } from "@/lib/storage"
import type {
  Collection,
  GenerationMode,
  ImagePage,
  ImageRecord,
  LibraryStats,
} from "@/lib/types"

const DATA_DIR = path.join(LIBRARY_DIR, "data")

const globalForDb = globalThis as unknown as { __imageDb?: DatabaseSync }

function open() {
  mkdirSync(DATA_DIR, { recursive: true })
  const db = new DatabaseSync(path.join(DATA_DIR, "library.db"))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      mode TEXT NOT NULL,
      model TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      size TEXT NOT NULL,
      quality TEXT NOT NULL,
      output_format TEXT NOT NULL,
      output_compression INTEGER NOT NULL,
      image_count INTEGER NOT NULL,
      inputs TEXT NOT NULL DEFAULT '[]',
      input_text_tokens INTEGER NOT NULL DEFAULT 0,
      input_image_tokens INTEGER NOT NULL DEFAULT 0,
      output_image_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      usage_json TEXT,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS images_generation_idx ON images(generation_id);

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_images (
      collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (collection_id, image_id)
    );

    CREATE INDEX IF NOT EXISTS collection_images_image_idx ON collection_images(image_id);
  `)
  return db
}

export function getDb() {
  return (globalForDb.__imageDb ??= open())
}

export type NewGeneration = {
  id: string
  prompt: string
  mode: GenerationMode
  model: string
  aspectRatio: string
  size: string
  quality: string
  outputFormat: string
  outputCompression: number
  inputs: string[]
  usage: Usage
  rawUsage: unknown
  costUsd: number
  durationMs: number
  images: { path: string; width: number; height: number; bytes: number }[]
}

/** Inserts a generation and its images, returning the new image ids. */
export function insertGeneration(g: NewGeneration) {
  const db = getDb()
  const now = Date.now()
  const ids: number[] = []

  db.exec("BEGIN")
  try {
    db.prepare(
      `INSERT INTO generations (
        id, prompt, mode, model, aspect_ratio, size, quality, output_format,
        output_compression, image_count, inputs, input_text_tokens,
        input_image_tokens, output_image_tokens, total_tokens, cost_usd,
        usage_json, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      g.id,
      g.prompt,
      g.mode,
      g.model,
      g.aspectRatio,
      g.size,
      g.quality,
      g.outputFormat,
      g.outputCompression,
      g.images.length,
      JSON.stringify(g.inputs),
      g.usage.inputTextTokens,
      g.usage.inputImageTokens,
      g.usage.outputImageTokens,
      g.usage.totalTokens,
      g.costUsd,
      JSON.stringify(g.rawUsage ?? null),
      g.durationMs,
      now
    )

    const insertImage = db.prepare(
      `INSERT INTO images (generation_id, path, width, height, bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const img of g.images) {
      const result = insertImage.run(
        g.id,
        img.path,
        img.width,
        img.height,
        img.bytes,
        now
      )
      ids.push(Number(result.lastInsertRowid))
    }
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
  return ids
}

type Row = Record<string, string | number | null>

const SELECT = `
  SELECT i.id, i.path, i.width, i.height, i.bytes, i.created_at AS image_created_at,
         g.id AS generation_id, g.prompt, g.mode, g.model, g.aspect_ratio, g.size,
         g.quality, g.output_format, g.output_compression, g.image_count, g.inputs,
         g.input_text_tokens, g.input_image_tokens, g.output_image_tokens,
         g.total_tokens, g.cost_usd, g.duration_ms,
         (SELECT group_concat(collection_id) FROM collection_images
          WHERE image_id = i.id) AS collection_ids
  FROM images i JOIN generations g ON g.id = i.generation_id
`

function toRecord(row: Row): ImageRecord {
  const inputs = JSON.parse(String(row.inputs)) as string[]
  return {
    id: Number(row.id),
    url: mediaUrl(String(row.path)),
    filePath: path.join(IMAGES_DIR, String(row.path)),
    width: Number(row.width),
    height: Number(row.height),
    bytes: Number(row.bytes),
    createdAt: Number(row.image_created_at),
    collectionIds: row.collection_ids
      ? String(row.collection_ids).split(",").map(Number)
      : [],
    generation: {
      id: String(row.generation_id),
      prompt: String(row.prompt),
      mode: row.mode as GenerationMode,
      model: String(row.model),
      aspectRatio: String(row.aspect_ratio),
      size: String(row.size),
      quality: String(row.quality),
      outputFormat: String(row.output_format),
      outputCompression: Number(row.output_compression),
      imageCount: Number(row.image_count),
      inputUrls: inputs.map(mediaUrl),
      usage: {
        inputTextTokens: Number(row.input_text_tokens),
        inputImageTokens: Number(row.input_image_tokens),
        outputImageTokens: Number(row.output_image_tokens),
        totalTokens: Number(row.total_tokens),
      },
      costUsd: Number(row.cost_usd),
      durationMs: Number(row.duration_ms),
    },
  }
}

export function getImages(ids: number[]) {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => "?").join(",")
  const rows = getDb()
    .prepare(`${SELECT} WHERE i.id IN (${placeholders}) ORDER BY i.id DESC`)
    .all(...ids) as Row[]
  return rows.map(toRecord)
}

export function getImage(id: number) {
  return getImages([id])[0] ?? null
}

export function listImages(
  cursor: number | null,
  limit: number,
  collectionId: number | null = null
): ImagePage {
  const inCollection =
    collectionId === null
      ? ""
      : "AND i.id IN (SELECT image_id FROM collection_images WHERE collection_id = ?)"
  const rows = getDb()
    .prepare(
      `${SELECT} WHERE i.id < ? ${inCollection} ORDER BY i.id DESC LIMIT ?`
    )
    .all(
      cursor ?? Number.MAX_SAFE_INTEGER,
      ...(collectionId === null ? [] : [collectionId]),
      limit + 1
    ) as Row[]

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(toRecord)
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}

/**
 * Removes an image and its file. Generation rows are kept (even once their last
 * image is gone) so the spend history stays accurate; only their attached
 * input files are cleaned up.
 */
export async function deleteImage(id: number) {
  const db = getDb()
  const row = db
    .prepare("SELECT path, generation_id FROM images WHERE id = ?")
    .get(id) as { path: string; generation_id: string } | undefined
  if (!row) return false

  db.prepare("DELETE FROM images WHERE id = ?").run(id)
  await deleteImageFile(row.path)

  const remaining = db
    .prepare("SELECT COUNT(*) AS n FROM images WHERE generation_id = ?")
    .get(row.generation_id) as { n: number }
  if (remaining.n === 0) {
    const gen = db
      .prepare("SELECT inputs FROM generations WHERE id = ?")
      .get(row.generation_id) as { inputs: string } | undefined
    for (const input of JSON.parse(gen?.inputs ?? "[]") as string[]) {
      await deleteImageFile(input)
    }
    db.prepare("UPDATE generations SET inputs = '[]' WHERE id = ?").run(
      row.generation_id
    )
  }
  return true
}

export function getStats(): LibraryStats {
  const db = getDb()
  const images = db.prepare("SELECT COUNT(*) AS n FROM images").get() as {
    n: number
  }
  const gens = db
    .prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(cost_usd), 0) AS cost, COALESCE(SUM(total_tokens), 0) AS tokens FROM generations"
    )
    .get() as { n: number; cost: number; tokens: number }
  return {
    images: images.n,
    generations: gens.n,
    costUsd: gens.cost,
    tokens: gens.tokens,
  }
}

const COLLECTION_SELECT = `
  SELECT c.id, c.name, c.created_at,
         (SELECT COUNT(*) FROM collection_images ci
          WHERE ci.collection_id = c.id) AS image_count
  FROM collections c
`

function toCollection(row: Row): Collection {
  const covers = getDb()
    .prepare(
      `SELECT i.path FROM collection_images ci JOIN images i ON i.id = ci.image_id
       WHERE ci.collection_id = ? ORDER BY ci.added_at DESC, i.id DESC LIMIT 4`
    )
    .all(row.id as number) as { path: string }[]
  return {
    id: Number(row.id),
    name: String(row.name),
    imageCount: Number(row.image_count),
    coverUrls: covers.map((c) => mediaUrl(c.path)),
    createdAt: Number(row.created_at),
  }
}

export function listCollections() {
  const rows = getDb()
    .prepare(`${COLLECTION_SELECT} ORDER BY c.id DESC`)
    .all() as Row[]
  return rows.map(toCollection)
}

export function getCollection(id: number) {
  const row = getDb()
    .prepare(`${COLLECTION_SELECT} WHERE c.id = ?`)
    .get(id) as Row | undefined
  return row ? toCollection(row) : null
}

function isUniqueViolation(err: unknown) {
  return err instanceof Error && err.message.includes("UNIQUE")
}

/** Names are unique ignoring case; a clash returns "duplicate". */
export function createCollection(name: string): Collection | "duplicate" {
  try {
    const result = getDb()
      .prepare("INSERT INTO collections (name, created_at) VALUES (?, ?)")
      .run(name, Date.now())
    return getCollection(Number(result.lastInsertRowid))!
  } catch (err) {
    if (isUniqueViolation(err)) return "duplicate"
    throw err
  }
}

export function renameCollection(
  id: number,
  name: string
): Collection | "duplicate" | null {
  try {
    const result = getDb()
      .prepare("UPDATE collections SET name = ? WHERE id = ?")
      .run(name, id)
    return result.changes ? getCollection(id) : null
  } catch (err) {
    if (isUniqueViolation(err)) return "duplicate"
    throw err
  }
}

/** Deletes the collection only; its images stay in the library. */
export function deleteCollection(id: number) {
  const result = getDb().prepare("DELETE FROM collections WHERE id = ?").run(id)
  return result.changes > 0
}

/** Adds images to a collection, skipping ids that don't exist or are already in it. */
export function addToCollection(collectionId: number, imageIds: number[]) {
  const db = getDb()
  const insert = db.prepare(
    `INSERT OR IGNORE INTO collection_images (collection_id, image_id, added_at)
     SELECT ?, id, ? FROM images WHERE id = ?`
  )
  const now = Date.now()
  db.exec("BEGIN")
  try {
    for (const imageId of imageIds) insert.run(collectionId, now, imageId)
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}

export function removeFromCollection(collectionId: number, imageIds: number[]) {
  const db = getDb()
  const remove = db.prepare(
    "DELETE FROM collection_images WHERE collection_id = ? AND image_id = ?"
  )
  db.exec("BEGIN")
  try {
    for (const imageId of imageIds) remove.run(collectionId, imageId)
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}
