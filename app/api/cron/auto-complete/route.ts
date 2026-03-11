import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, parseJsonArray } from "@/lib/calculations"
import { sendLowStockEmail } from "@/lib/email"

/**
 * POST /api/cron/auto-complete
 *
 * Runs once per day (e.g. at 23:59) via cron, OR is triggered inline
 * by the dashboard API on each load.
 *
 * Logic:
 *   • Find every PENDING DoseLog whose scheduledAt is before end-of-yesterday
 *     (i.e. the user never tapped "Taken" before midnight).
 *   • Mark them TAKEN (not MISSED) — medication was assumed taken.
 *   • Decrement the patient's inventory by pillsPerDose.
 *   • Log an InventoryEvent for audit trail.
 *   • Fire a LOW_STOCK notification if stock falls below threshold.
 */
export async function POST(req: NextRequest) {
  // Allow internal calls (no secret) OR external cron calls (with secret)
  const secret = req.headers.get("x-cron-secret")
  const isExternal = !!secret
  if (isExternal && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runAutoComplete()
  return NextResponse.json({ ok: true, ...result })
}

// ── Exported so the dashboard API can call it inline ─────────────────────────
export async function runAutoComplete() {
  const now = new Date()

  const overduePending = await prisma.doseLog.findMany({
    where: {
      scheduledAt: { lte: now },
      status:      "PENDING",
      schedule:    { active: true },
    },
    include: {
      schedule: {
        include: {
          patientMedication: {
            include: {
              patient: { include: { user: true } },
              medication: true,
            },
          },
        },
      },
    },
  })

  const results = { autoCompleted: 0, lowStockAlerts: 0, emailsSent: 0 }

  // Accumulate low-stock items per user for batched emails
  const emailBatch = new Map<string, {
    user:        { id: string; email: string; name: string | null; emailNotifs: boolean; emailAlertLevel: string }
    patientName: string
    patientId:   string
    items:       Array<{ name: string; brandName?: string; strength?: string; unitType: string; pillsInStock: number; daysLeft: number; threshold: number; status: "low" | "critical" }>
  }>()

  for (const log of overduePending) {
    const pm           = log.schedule.patientMedication
    const pillsPerDose = log.schedule.pillsPerDose
    const newStock     = Math.max(0, pm.pillsInStock - pillsPerDose)

    // 1. Mark TAKEN
    await prisma.doseLog.update({
      where: { id: log.id },
      data:  { status: "TAKEN", takenAt: log.scheduledAt, pillsDecremented: pillsPerDose, notes: "Auto-completed at end of day" },
    })

    // 2. Decrement inventory
    await prisma.patientMedication.update({
      where: { id: pm.id },
      data:  { pillsInStock: newStock },
    })

    // 3. Audit trail
    await prisma.inventoryEvent.create({
      data: {
        patientMedicationId: pm.id,
        type:     "DECREMENT",
        quantity: -pillsPerDose,
        reason:   "Auto-completed (end-of-day)",
      },
    })

    results.autoCompleted++

    // 4. Low-stock check
    const avgDaily = calcAvgDailyPills({
      timesOfDay:   parseJsonArray(log.schedule.timesOfDay as string, ["08:00"]),
      daysOfWeek:   parseJsonArray(log.schedule.daysOfWeek  as string, [1,2,3,4,5,6,7]),
      pillsPerDose: log.schedule.pillsPerDose,
      startDate:    log.schedule.startDate,
    })
    const daysLeft = calcDaysRemaining(newStock, avgDaily)

    if (daysLeft <= pm.lowStockThreshold) {
      // In-app notification (once per day)
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
      const existing = await prisma.notification.findFirst({
        where: { userId: pm.patient.userId, patientId: pm.patientId, type: "LOW_STOCK", createdAt: { gte: todayStart } },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId:    pm.patient.userId,
            patientId: pm.patientId,
            type:      "LOW_STOCK",
            message:   `${pm.patient.name}'s ${pm.medication.name} is running low — ${newStock.toFixed(1)} left (~${daysLeft} days).`,
            channel:   "IN_APP",
          },
        })
        results.lowStockAlerts++
      }

      // Accumulate for email batch
      const user = pm.patient.user as typeof pm.patient.user & { emailNotifs: boolean; emailAlertLevel: string }
      const status: "critical" | "low" = daysLeft <= 3 || newStock <= pm.lowStockThreshold / 2 ? "critical" : "low"
      const alertLevel = (user as any).emailAlertLevel ?? "low"

      // Only include if user's alert level matches
      const shouldEmailForStatus =
        user.emailNotifs &&
        alertLevel !== "off" &&
        (alertLevel === "low" || (alertLevel === "critical" && status === "critical"))

      if (shouldEmailForStatus) {
        const batchKey = `${user.id}::${pm.patientId}`
        if (!emailBatch.has(batchKey)) {
          emailBatch.set(batchKey, {
            user:        { id: user.id, email: user.email, name: user.name, emailNotifs: user.emailNotifs, emailAlertLevel: alertLevel },
            patientName: pm.patient.name,
            patientId:   pm.patientId,
            items:       [],
          })
        }
        emailBatch.get(batchKey)!.items.push({
          name:         pm.medication.name,
          brandName:    pm.medication.brandName ?? undefined,
          strength:     pm.medication.strength  ?? undefined,
          unitType:     pm.unitType,
          pillsInStock: newStock,
          daysLeft,
          threshold:    pm.lowStockThreshold,
          status,
        })
      }
    }
  }

  // 5. Send batched emails (one per user+patient combo, once per day)
  for (const [, batch] of Array.from(emailBatch)) {
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId:    batch.user.id,
        patientId: batch.patientId,
        type:      "LOW_STOCK",
        channel:   "EMAIL",
        createdAt: { gte: todayStart },
      },
    })
    if (alreadySent) continue

    const sent = await sendLowStockEmail({
      toEmail:     batch.user.email,
      toName:      batch.user.name ?? "Caregiver",
      patientName: batch.patientName,
      medications: batch.items,
    })

    if (sent) {
      // Log that the email was sent
      await prisma.notification.create({
        data: {
          userId:    batch.user.id,
          patientId: batch.patientId,
          type:      "LOW_STOCK",
          channel:   "EMAIL",
          message:   `Email alert sent for ${batch.patientName}: ${batch.items.map(i => i.brandName ?? i.name).join(", ")}`,
          sentAt:    now,
        },
      })
      results.emailsSent++
    }
  }

  return results
}
