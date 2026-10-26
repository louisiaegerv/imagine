"use client"

import * as React from "react"

import type { Collection } from "@/lib/types"

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

async function send<T>(
  url: string,
  method: string,
  body?: unknown
): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "Something went wrong" }
    }
    return { ok: true, value: data as T }
  } catch {
    return { ok: false, error: "Couldn't reach the server" }
  }
}

export const renameCollection = (id: number, name: string) =>
  send<Collection>(`/api/collections/${id}`, "PATCH", { name })

export const deleteCollection = (id: number) =>
  send<{ ok: true }>(`/api/collections/${id}`, "DELETE")

export const addImagesToCollection = (id: number, imageIds: number[]) =>
  send<{ ok: true }>(`/api/collections/${id}/images`, "POST", { imageIds })

export const removeImagesFromCollection = (id: number, imageIds: number[]) =>
  send<{ ok: true }>(`/api/collections/${id}/images`, "DELETE", { imageIds })

/** `null` until the first response arrives. */
export function useCollections() {
  const [collections, setCollections] = React.useState<Collection[] | null>(null)

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/collections")
    if (res.ok) setCollections(await res.json())
  }, [])

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/collections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && data && setCollections(data))
    return () => {
      cancelled = true
    }
  }, [])

  const create = React.useCallback(async (name: string) => {
    const result = await send<Collection>("/api/collections", "POST", { name })
    if (result.ok) setCollections((prev) => [result.value, ...(prev ?? [])])
    return result
  }, [])

  return { collections, create, refresh }
}
