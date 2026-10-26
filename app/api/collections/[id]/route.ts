import { NextResponse } from "next/server"

import { collectionNameSchema } from "@/lib/validation"
import { deleteCollection, getCollection, renameCollection } from "@/lib/db"

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 })

export async function GET(_request: Request, { params }: Context) {
  const collection = getCollection(Number((await params).id))
  return collection ? NextResponse.json(collection) : notFound()
}

export async function PATCH(request: Request, { params }: Context) {
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  const name = collectionNameSchema.safeParse(body?.name)
  if (!name.success) {
    return NextResponse.json({ error: name.error.issues[0].message }, { status: 400 })
  }

  const collection = renameCollection(id, name.data)
  if (collection === "duplicate") {
    return NextResponse.json(
      { error: "A collection with that name already exists" },
      { status: 409 }
    )
  }
  return collection ? NextResponse.json(collection) : notFound()
}

export async function DELETE(_request: Request, { params }: Context) {
  return deleteCollection(Number((await params).id))
    ? NextResponse.json({ ok: true })
    : notFound()
}
