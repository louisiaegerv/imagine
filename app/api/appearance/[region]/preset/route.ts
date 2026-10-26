import { NextResponse } from "next/server"

import { setPreset } from "@/lib/appearance"
import { isPresetId, isRegion } from "@/lib/appearance-config"

/** Applies one of the bundled backgrounds to the sidebar or main area. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ region: string }> }
) {
  const { region } = await params
  if (!isRegion(region)) {
    return NextResponse.json({ error: "Unknown region" }, { status: 404 })
  }
  const body = await request.json().catch(() => null)
  if (typeof body?.id !== "string" || !isPresetId(body.id)) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 400 })
  }
  return NextResponse.json(await setPreset(region, body.id))
}
