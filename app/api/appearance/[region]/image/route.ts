import { NextResponse } from "next/server"

import {
  ACCEPTED_BACKGROUND_TYPES,
  MAX_BACKGROUND_BYTES,
  isRegion,
} from "@/lib/appearance-config"
import { clearBackground, setBackground } from "@/lib/appearance"

type Context = { params: Promise<{ region: string }> }

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status })

export async function POST(request: Request, { params }: Context) {
  const { region } = await params
  if (!isRegion(region)) return fail("Unknown region", 404)

  const form = await request.formData().catch(() => null)
  const file = form?.get("image")
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image", 400)
  if (!ACCEPTED_BACKGROUND_TYPES.includes(file.type)) {
    return fail("Only PNG, JPEG and WebP images are supported", 400)
  }
  if (file.size > MAX_BACKGROUND_BYTES) return fail("That image is larger than 25MB", 400)

  try {
    return NextResponse.json(await setBackground(region, file))
  } catch {
    return fail("That file couldn't be read as an image", 400)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { region } = await params
  if (!isRegion(region)) return fail("Unknown region", 404)
  return NextResponse.json(await clearBackground(region))
}
