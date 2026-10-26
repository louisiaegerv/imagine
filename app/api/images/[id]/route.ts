import { NextResponse } from "next/server"

import { deleteImage, getImage } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const image = getImage(Number((await params).id))
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(image)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deleted = await deleteImage(Number((await params).id))
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
