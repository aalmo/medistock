import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

/**
 * GET /api/email-test
 * Public diagnostic endpoint — tests SMTP directly, no auth needed.
 * Remove or secure this endpoint in production!
 */
export async function GET() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM ?? "MediStock <noreply@medistock.app>"
  const to   = process.env.EMAIL_TEST_TO ?? user ?? ""

  const config = {
    host:  host  ?? "NOT_SET",
    port:  port,
    user:  user  ?? "NOT_SET",
    pass:  pass  ? "***SET***" : "NOT_SET",
    from,
    to,
  }

  if (!host || !user || !pass) {
    return NextResponse.json({
      ok: false,
      error: "SMTP not configured — check .env file",
      config,
    }, { status: 500 })
  }

  const transport = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: "✅ MediStock SMTP — Diagnostic Test",
      text: "SMTP is configured and working correctly.",
      html: `<div style="font-family:sans-serif;padding:24px;max-width:480px;">
        <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:14px;padding:20px 24px;margin-bottom:16px;">
          <h2 style="color:#fff;margin:0;font-size:20px;">💊 MediStock</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px;">Diagnostic Email Test</p>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
          <p style="font-weight:700;color:#15803d;margin:0 0 8px;">✅ SMTP is working!</p>
          <p style="color:#374151;font-size:13px;margin:0;">Host: <code>${host}:${port}</code><br/>
          User: <code>${user}</code><br/>Mode: ${port === 465 ? "SSL/TLS" : "STARTTLS"}</p>
        </div>
      </div>`,
    })

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      accepted:  info.accepted,
      sentTo:    to,
      config,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg, config }, { status: 500 })
  }
}

