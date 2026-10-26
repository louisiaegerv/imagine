import { NextResponse } from "next/server"

import { deleteImages, listImages } from "@/lib/db"
import { imageIdsSchema } from "@/lib/validation"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const cursorParam = params.get("cursor")
  const cursor = cursorParam ? Number(cursorParam) : null
  const collectionParam = params.get("collection")
  const collectionId = collectionParam ? Number(collectionParam) : null
  const limit = Math.min(Math.max(Number(params.get("limit")) || 24, 1), 60)

  if (cursor !== null && !Number.isFinite(cursor)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 })
  }
  if (collectionId !== null && !Number.isInteger(collectionId)) {
    return NextResponse.json({ error: "Invalid collection" }, { status: 400 })
  }
  return NextResponse.json(listImages(cursor, limit, collectionId))
}

/** Permanently deletes the given images. Responds with the ids that were removed. */
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null)
  const imageIds = imageIdsSchema.safeParse(body?.imageIds)
  if (!imageIds.success) {
    return NextResponse.json({ error: "imageIds must be a list of image ids" }, { status: 400 })
  }
  return NextResponse.json({ deleted: await deleteImages(imageIds.data) })
}
