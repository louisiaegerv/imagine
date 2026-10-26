import { NextResponse } from "next/server"

import { listImages } from "@/lib/db"

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
