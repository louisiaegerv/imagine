import { NextResponse } from "next/server"

import { getAppearance } from "@/lib/appearance"

export function GET() {
  return NextResponse.json(getAppearance())
}
