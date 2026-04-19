import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, parseJsonArray } from "@/lib/calculations"
import { syncPillsInStock } from "@/lib/inventory-sync"
import { subMinutes, startOfDay, addDays } from "date-fns"
import { lowStockMessage } from "@/lib/notification-messages"

// POST /api/cron/decrement
// Called every 15 min by Vercel Cron
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now         = new Date()
  const windowStart = subMinutes(now, 15)
  const todayStart  = startOfDay(now)

  // #6 — Re-sync any PM whose package expires today so pillsInStock stays
  // accurate at day boundaries, even when no dose logs are due.
  const expiringToday = await prisma.medicationPackage.findMany({
    where:    { expiryDate: { gte: todayStart, lt: addDays(todayStart, 1) } },
    select:   { patientMedicationId: true },
    distinct: ["patientMedicationId"],
  })
  await Promise.all(expiringToday.map(({ patientMedicationId }) => syncPillsInStock(patientMedicationId)))

  // Find PENDING dose logs that are past due
  const dueLogs = await prisma.doseLog.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: now },
      status:      "PENDING",
      schedule:    { active: true },
    },
    include: {
      schedule: {
        include: {
          patientMedication: {
            include: {
              patient:    { include: { user: true } },
              medication: true,
              // FIFO: fetch non-expired packages ordered oldest-expiry first
              packages: {
                where:   { expiryDate: { gte: todayStart } },
                orderBy: { expiryDate: "asc" },
              },
              // All active schedules — needed for accurate avgDailyPills across the whole medication
              schedules: { where: { active: true } },
            },
          },
        },
      },
    },
  })

  const results = { processed: 0, lowStockAlerts: 0 }

  // Group logs by patientMedicationId to avoid race conditions when multiple
  // dose logs for the same medication fall in the same 15-minute window.
  const pmGroups = new Map<string, typeof dueLogs>()
  for (const log of dueLogs) {
    const pmId = log.schedule.patientMedicationId
    if (!pmGroups.has(pmId)) pmGroups.set(pmId, [])
    pmGroups.get(pmId)!.push(log)
  }

  for (const [, logs] of pmGroups) {
    const pm = logs[0].schedule.patientMedication

    // ── Idempotency: atomically claim each DoseLog (PENDING → TAKEN) inside
    // the same transaction as the stock mutation. If the cron retries, the
    // WHERE status="PENDING" predicate matches 0 rows → we skip entirely.
    let newStock: number
    let claimedLogs: typeof logs

    if (pm.packages.length === 0) {
      // ── Fallback: no packages — direct decrement ──
      const result = await prisma.$transaction(async (tx) => {
        const claims = await Promise.all(
          logs.map(log => tx.doseLog.updateMany({
            where: { id: log.id, status: "PENDING" },
            data:  { status: "TAKEN", takenAt: now, pillsDecremented: log.schedule.pillsPerDose },
          }))
        )
        const claimed = logs.filter((_, i) => claims[i].count > 0)
        if (claimed.length === 0) return null   // already processed

        const totalPills = claimed.reduce((sum, l) => sum + l.schedule.pillsPerDose, 0)
        const stock      = Math.max(0, pm.pillsInStock - totalPills)
        await tx.patientMedication.update({ where: { id: pm.id }, data: { pillsInStock: stock } })
        return { stock, claimed }
      })
      if (!result) continue
      newStock    = result.stock
      claimedLogs = result.claimed
    } else {
      // ── FIFO package deduction ──
      const result = await prisma.$transaction(async (tx) => {
        const claims = await Promise.all(
          logs.map(log => tx.doseLog.updateMany({
            where: { id: log.id, status: "PENDING" },
            data:  { status: "TAKEN", takenAt: now, pillsDecremented: log.schedule.pillsPerDose },
          }))
        )
        const claimed = logs.filter((_, i) => claims[i].count > 0)
        if (claimed.length === 0) return null   // already processed

        const totalPills = claimed.reduce((sum, l) => sum + l.schedule.pillsPerDose, 0)
        let remaining    = totalPills

        for (const pkg of pm.packages) {
          if (remaining <= 0) break
          const deduct = Math.min(pkg.quantity, remaining)
          const newQty = pkg.quantity - deduct
          if (newQty <= 0) {
            await tx.medicationPackage.delete({ where: { id: pkg.id } })
          } else {
            await tx.medicationPackage.update({ where: { id: pkg.id }, data: { quantity: newQty } })
          }
          remaining -= deduct
        }

        return { stock: await syncPillsInStock(pm.id, tx), claimed }
      })
      if (!result) continue
      newStock    = result.stock
      claimedLogs = result.claimed
    }

    // Create inventory events only for the logs we actually claimed this run
    for (const log of claimedLogs) {
      await prisma.inventoryEvent.create({
        data: {
          patientMedicationId: pm.id,
          type:                "DECREMENT",
          quantity:            -log.schedule.pillsPerDose,
          reason:              "Auto-decrement (scheduled)",
        },
      })
      results.processed++
    }

    // ── Low-stock check — use sum of ALL active schedules for accurate daysLeft ──
    const avgDaily = pm.schedules.reduce((sum, s) =>
      sum + calcAvgDailyPills({
        timesOfDay:   parseJsonArray(s.timesOfDay,  ["08:00"]),
        daysOfWeek:   parseJsonArray(s.daysOfWeek,  [1, 2, 3, 4, 5, 6, 7]),
        pillsPerDose: s.pillsPerDose,
        startDate:    s.startDate,
        endDate:      s.endDate,
      }), 0)

    const daysLeft = calcDaysRemaining(newStock, avgDaily)

    const isLowByDays  = daysLeft  <= pm.lowStockThreshold
    const isLowByPills = newStock  <= pm.lowStockPills

    if (isLowByDays || isLowByPills) {
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      const existing = await prisma.notification.findFirst({
        where: {
          userId:    pm.patient.userId,
          patientId: pm.patientId,
          type:      "LOW_STOCK",
          createdAt: { gte: dayStart },
        },
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId:    pm.patient.userId,
            patientId: pm.patientId,
            type:      "LOW_STOCK",
            message:   lowStockMessage(pm.patient.name, pm.medication.name, newStock, daysLeft, pm.patient.user?.language),
            channel:   "IN_APP",
            metadata:  JSON.stringify({ medicationId: pm.medicationId, tags: pm.medication.tags ?? "[]" }),
          },
        })
        results.lowStockAlerts++
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
