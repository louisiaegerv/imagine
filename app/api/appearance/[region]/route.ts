import { NextResponse } from "next/server"
import { z } from "zod"

import { BLUR_MAX, OVERLAY_MAX, isRegion } from "@/lib/appearance-config"
import { updateStyle } from "@/lib/appearance"

const styleSchema = z.object({
  blur: z.number().int().min(0).max(BLUR_MAX).optional(),
  overlay: z.number().int().min(0).max(OVERLAY_MAX).optional(),
})

/** Updates the blur and/or overlay opacity for the sidebar or main area. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ region: string }> }
) {
  const { region } = await params
  if (!isRegion(region)) {
    return NextResponse.json({ error: "Unknown region" }, { status: 404 })
  }
  const body = styleSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: "Invalid blur or overlay" }, { status: 400 })
  }
  return NextResponse.json(updateStyle(region, body.data))
}
