"use client"

import * as React from "react"

import type {
  Collection,
  ImagePage,
  ImageRecord,
  LibraryStats,
} from "@/lib/types"

const PAGE_SIZE = 24

export type LibrarySummary = { images: number; costUsd?: number }

/** Lists the whole library, or just one collection when `collectionId` is set. */
export function useLibrary(collectionId?: number) {
  const [items, setItems] = React.useState<ImageRecord[]>([])
  const [hasMore, setHasMore] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [summary, setSummary] = React.useState<LibrarySummary | null>(null)
  const cursor = React.useRef<number | null>(null)
  const busy = React.useRef(false)
  const done = React.useRef(false)

  const summaryUrl =
    collectionId === undefined ? "/api/stats" : `/api/collections/${collectionId}`

  const parseSummary = React.useCallback(
    (data: LibraryStats | Collection): LibrarySummary =>
      collectionId === undefined
        ? {
            images: (data as LibraryStats).images,
            costUsd: (data as LibraryStats).costUsd,
          }
        : { images: (data as Collection).imageCount },
    [collectionId]
  )

  const loadSummary = React.useCallback(async () => {
    const res = await fetch(summaryUrl)
    if (res.ok) setSummary(parseSummary(await res.json()))
  }, [summaryUrl, parseSummary])

  const loadMore = React.useCallback(async () => {
    if (busy.current || done.current) return
    busy.current = true
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (collectionId !== undefined) qs.set("collection", String(collectionId))
      if (cursor.current !== null) qs.set("cursor", String(cursor.current))
      const res = await fetch(`/api/images?${qs}`)
      if (!res.ok) throw new Error("Failed to load images")
      const page = (await res.json()) as ImagePage
      cursor.current = page.nextCursor
      done.current = page.nextCursor === null
      setHasMore(!done.current)
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))]
      })
    } catch {
      // Stop auto-loading on failure so the observer doesn't hammer the API.
      done.current = true
      setHasMore(false)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [collectionId])

  // The first page is fetched by the list's infinite-scroll sentinel.
  React.useEffect(() => {
    let cancelled = false
    fetch(summaryUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && data && setSummary(parseSummary(data)))
    return () => {
      cancelled = true
    }
  }, [summaryUrl, parseSummary])

  /** Drops images from the loaded list (they were deleted or left the collection). */
  const dropFromList = React.useCallback(
    (ids: number[]) => {
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)))
      loadSummary()
    },
    [loadSummary]
  )

  const update = React.useCallback(
    (ids: number[], change: (image: ImageRecord) => ImageRecord) =>
      setItems((prev) => prev.map((i) => (ids.includes(i.id) ? change(i) : i))),
    []
  )

  const remove = React.useCallback(
    async (id: number) => {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" })
      if (!res.ok) return false
      dropFromList([id])
      return true
    },
    [dropFromList]
  )

  /** Deletes many images at once; resolves to the ids that were removed. */
  const removeMany = React.useCallback(
    async (ids: number[]) => {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: ids }),
      }).catch(() => null)
      if (!res?.ok) return []
      const { deleted } = (await res.json()) as { deleted: number[] }
      if (deleted.length > 0) dropFromList(deleted)
      return deleted
    },
    [dropFromList]
  )

  return {
    items,
    hasMore,
    loading,
    summary,
    loadMore,
    remove,
    removeMany,
    dropFromList,
    update,
  }
}
