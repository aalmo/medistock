import { NextRequest, NextResponse } from "next/server"
import { searchRxNorm } from "@/lib/rxnorm"
import { searchOpenFDA } from "@/lib/openfda"

// GET /api/search?q=aspirin&source=rxnorm|openfda
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get("q")      ?? ""
  const source = searchParams.get("source") ?? "rxnorm"

  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  try {
    const isFDA = source === "openfda"
    const primary   = isFDA ? searchOpenFDA : searchRxNorm
    const fallback  = isFDA ? null : searchOpenFDA

    let results = await primary(q)
    if (results.length === 0 && fallback) results = await fallback(q) as typeof results

    return NextResponse.json({ data: results })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
