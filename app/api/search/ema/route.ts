import { NextRequest, NextResponse } from "next/server"
import { searchEMA } from "@/lib/ema"

// GET /api/search/ema?q=ibuprofen
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""

  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  const results = await searchEMA(q)
  return NextResponse.json({ data: results })
}

