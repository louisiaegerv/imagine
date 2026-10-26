import { NextResponse } from "next/server"

import { imageIdsSchema } from "@/lib/validation"
import { addToCollection, getCollection, removeFromCollection } from "@/lib/db"

type Context = { params: Promise<{ id: string }> }

async function update(
  request: Request,
  { params }: Context,
  apply: (collectionId: number, imageIds: number[]) => void
) {
  const id = Number((await params).id)
  if (!getCollection(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const imageIds = imageIdsSchema.safeParse(body?.imageIds)
  if (!imageIds.success) {
    return NextResponse.json({ error: "imageIds must be a list of image ids" }, { status: 400 })
  }

  apply(id, imageIds.data)
  return NextResponse.json({ ok: true })
}

export function POST(request: Request, context: Context) {
  return update(request, context, addToCollection)
}

export function DELETE(request: Request, context: Context) {
  return update(request, context, removeFromCollection)
}
