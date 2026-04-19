/**
 * lib/auto-complete.ts
 *
 * Core auto-complete logic extracted from the cron route so it can be imported
 * by the dashboard API without violating Next.js route-file export rules.
 */
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, parseJsonArray } from "@/lib/calculations"
import { sendLowStockEmail } from "@/lib/email"
import { lowStockMessage, lowStockEmailSentMessage } from "@/lib/notification-messages"

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

  const emailBatch = new Map<string, {
    user:        { id: string; email: string; name: string | null; emailNotifs: boolean; emailAlertLevel: string; language?: string }
    patientName: string
    patientId:   string
    items:       Array<{ name: string; brandName?: string; strength?: string; unitType: string; pillsInStock: number; daysLeft: number; threshold: number; status: "low" | "critical" }>
  }>()

  for (const log of overduePending) {
    const pm           = log.schedule.patientMedication
    const pillsPerDose = log.schedule.pillsPerDose
    const newStock     = Math.max(0, pm.pillsInStock - pillsPerDose)

    await prisma.doseLog.update({
      where: { id: log.id },
      data:  { status: "TAKEN", takenAt: log.scheduledAt, pillsDecremented: pillsPerDose, notes: "Auto-completed at end of day" },
    })

    await prisma.patientMedication.update({
      where: { id: pm.id },
      data:  { pillsInStock: newStock },
    })

    await prisma.inventoryEvent.create({
      data: {
        patientMedicationId: pm.id,
        type:     "DECREMENT",
        quantity: -pillsPerDose,
        reason:   "Auto-completed (end-of-day)",
      },
    })

    results.autoCompleted++

    const avgDaily = calcAvgDailyPills({
      timesOfDay:   parseJsonArray(log.schedule.timesOfDay as string, ["08:00"]),
      daysOfWeek:   parseJsonArray(log.schedule.daysOfWeek  as string, [1,2,3,4,5,6,7]),
      pillsPerDose: log.schedule.pillsPerDose,
      startDate:    log.schedule.startDate,
    })
    const daysLeft = calcDaysRemaining(newStock, avgDaily)

    if (daysLeft <= pm.lowStockThreshold) {
      const user = pm.patient.user as typeof pm.patient.user & { emailNotifs: boolean; emailAlertLevel: string }
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
            message:   lowStockMessage(pm.patient.name, pm.medication.name, newStock, daysLeft, user.language),
            channel:   "IN_APP",
          },
        })
        results.lowStockAlerts++
      }

      const status: "critical" | "low" = daysLeft <= 3 || newStock <= pm.lowStockThreshold / 2 ? "critical" : "low"
      const alertLevel = user.emailAlertLevel ?? "low"

      const shouldEmailForStatus =
        user.emailNotifs &&
        alertLevel !== "off" &&
        (alertLevel === "low" || (alertLevel === "critical" && status === "critical"))

      if (shouldEmailForStatus) {
        const batchKey = `${user.id}::${pm.patientId}`
        if (!emailBatch.has(batchKey)) {
          emailBatch.set(batchKey, {
            user:        { id: user.id, email: user.email, name: user.name, emailNotifs: user.emailNotifs, emailAlertLevel: alertLevel, language: user.language },
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
      language:    batch.user.language || "en",
    })

    if (sent) {
      await prisma.notification.create({
        data: {
          userId:    batch.user.id,
          patientId: batch.patientId,
          type:      "LOW_STOCK",
          channel:   "EMAIL",
          message:   lowStockEmailSentMessage(batch.patientName, batch.items.map(i => i.brandName ?? i.name).join(", "), batch.user.language),
          sentAt:    now,
        },
      })
      results.emailsSent++
    }
  }

  return results
}
