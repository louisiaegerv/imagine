import { NextResponse } from "next/server"

import { getStats } from "@/lib/db"

export function GET() {
  return NextResponse.json(getStats())
}
