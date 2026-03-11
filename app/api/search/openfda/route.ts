import { NextRequest, NextResponse } from "next/server"
import { searchOpenFDA } from "@/lib/openfda"

// GET /api/search/openfda?q=aspirin
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const results = await searchOpenFDA(q)
  return NextResponse.json({ data: results })
}

