import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendLowStockEmail } from "@/lib/email"

// POST /api/notifications/test-email
// Sends a sample low-stock email to the current user
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where:  { id: (session.user as { id: string }).id },
    select: { email: true, name: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Diagnostic: log what env vars the server actually sees
  const smtpDiag = {
    host:  process.env.SMTP_HOST   ?? "NOT_SET",
    port:  process.env.SMTP_PORT   ?? "NOT_SET",
    user:  process.env.SMTP_USER   ?? "NOT_SET",
    pass:  process.env.SMTP_PASS   ? "***SET***" : "NOT_SET",
    from:  process.env.EMAIL_FROM  ?? "NOT_SET",
  }
  console.log("[test-email] SMTP config seen by server:", smtpDiag)

  const recipient = user.email
  console.log("[test-email] Sending to:", recipient)

  const ok = await sendLowStockEmail({
    toEmail:     recipient,
    toName:      user.name ?? "Caregiver",
    patientName: "John Demo",
    medications: [
      {
        name:         "Ibuprofen",
        brandName:    "Nurofen",
        strength:     "400 mg",
        unitType:     "pill",
        pillsInStock: 8,
        daysLeft:     4,
        threshold:    7,
        status:       "critical",
      },
      {
        name:         "Salbutamol",
        brandName:    "Ventolin",
        strength:     "100 mcg",
        unitType:     "inhalation",
        pillsInStock: 45,
        daysLeft:     9,
        threshold:    14,
        status:       "low",
      },
    ],
  })

  if (!ok) return NextResponse.json({ error: "SMTP send failed — check server console for details", smtpDiag }, { status: 500 })
  return NextResponse.json({ ok: true, sentTo: recipient, smtpDiag })
}
