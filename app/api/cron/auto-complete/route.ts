import { NextRequest, NextResponse } from "next/server"
import { runAutoComplete } from "@/lib/auto-complete"

/**
 * POST /api/cron/auto-complete
 * Triggered daily at 23:55 via Vercel Cron, or inline by the dashboard API.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  const isExternal = !!secret
  if (isExternal && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await runAutoComplete()
  return NextResponse.json({ ok: true, ...result })
}
