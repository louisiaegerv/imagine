import { NextResponse } from "next/server"

import { createCollection, listCollections } from "@/lib/db"
import { collectionNameSchema } from "@/lib/validation"

export function GET() {
  return NextResponse.json(listCollections())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const name = collectionNameSchema.safeParse(body?.name)
  if (!name.success) {
    return NextResponse.json({ error: name.error.issues[0].message }, { status: 400 })
  }

  const collection = createCollection(name.data)
  if (collection === "duplicate") {
    return NextResponse.json(
      { error: "A collection with that name already exists" },
      { status: 409 }
    )
  }
  return NextResponse.json(collection, { status: 201 })
}
