import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendExpiryEmail } from "@/lib/email"
// SMTP-based expiry check cron

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret && secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const result = await runExpiryCheck()
  return NextResponse.json({ ok: true, ...result })
}

export async function runExpiryCheck() {
  const now   = new Date()
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, emailNotifs: true, emailAlertLevel: true, expiryAlertDays: true },
  })

  let inAppCreated = 0
  let emailsSent   = 0

  for (const user of users) {
    const alertWindow = new Date(now.getTime() + user.expiryAlertDays * 86_400_000)
    const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0)

    const packages = await prisma.medicationPackage.findMany({
      where: {
        expiryDate: { lte: alertWindow },
        patientMedication: { patient: { userId: user.id } },
      },
      include: {
        patientMedication: {
          include: {
            medication: { select: { name: true, brandName: true, strength: true } },
            patient:    { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    })

    if (packages.length === 0) continue

    for (const pkg of packages) {
      const pm       = pkg.patientMedication
      const daysLeft = Math.ceil((pkg.expiryDate.getTime() - now.getTime()) / 86_400_000)
      const isExpired  = daysLeft <= 0
      const isCritical = daysLeft <= 7

      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId:    user.id,
          type:      "EXPIRY_ALERT",
          metadata:  { contains: pkg.id },
          createdAt: { gte: todayStart },
        },
      })
      if (!existingNotif) {
        const medName = pm.medication.brandName ?? pm.medication.name
        await prisma.notification.create({
          data: {
            userId:    user.id,
            patientId: pm.patient.id,
            type:      "EXPIRY_ALERT",
            channel:   "IN_APP",
            message:   isExpired
              ? `⚠️ EXPIRED: ${pm.patient.name}'s ${medName} (Lot: ${pkg.lotNumber ?? "N/A"}) expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} ago.`
              : `${isCritical ? "🔴" : "🟡"} ${pm.patient.name}'s ${medName} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (Lot: ${pkg.lotNumber ?? "N/A"}).`,
            metadata:  JSON.stringify({ packageId: pkg.id, daysLeft }),
          },
        })
        inAppCreated++
      }
    }

    // Email — once per day per user
    if (user.emailNotifs && user.emailAlertLevel !== "off") {
      const alreadyEmailed = await prisma.notification.findFirst({
        where: { userId: user.id, type: "EXPIRY_ALERT", channel: "EMAIL", createdAt: { gte: todayStart } },
      })
      if (!alreadyEmailed) {
        const byPatient = new Map<string, typeof packages>()
        for (const pkg of packages) {
          const pid = pkg.patientMedication.patient.id
          if (!byPatient.has(pid)) byPatient.set(pid, [])
          byPatient.get(pid)!.push(pkg)
        }
        for (const [, patientPkgs] of Array.from(byPatient)) {
          const patientName = patientPkgs[0].patientMedication.patient.name
          const sent = await sendExpiryEmail({
            toEmail:     user.email,
            toName:      user.name ?? "Caregiver",
            patientName,
            packages: patientPkgs.map(pkg => {
              const dl = Math.ceil((pkg.expiryDate.getTime() - now.getTime()) / 86_400_000)
              return {
                medicationName: pkg.patientMedication.medication.brandName ?? pkg.patientMedication.medication.name,
                strength:       pkg.patientMedication.medication.strength   ?? undefined,
                lotNumber:      pkg.lotNumber  ?? undefined,
                expiryDate:     pkg.expiryDate.toISOString(),
                quantity:       pkg.quantity,
                unitType:       pkg.unitType,
                daysLeft:       dl,
                status:         dl <= 0 ? "expired" : dl <= 7 ? "critical" : "warning",
              } as const
            }),
          })
          if (sent) {
            await prisma.notification.create({
              data: {
                userId:    user.id,
                patientId: patientPkgs[0].patientMedication.patient.id,
                type:      "EXPIRY_ALERT",
                channel:   "EMAIL",
                message:   `Expiry email sent for ${patientName}: ${patientPkgs.length} package(s) expiring soon.`,
                sentAt:    now,
              },
            })
            emailsSent++
          }
        }
      }
    }
  }
  return { inAppCreated, emailsSent }
}

