import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, parseJsonArray } from "@/lib/calculations"
import { syncPillsInStock } from "@/lib/inventory-sync"
import { subMinutes, startOfDay } from "date-fns"
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
            },
          },
        },
      },
    },
  })

  const results = { processed: 0, lowStockAlerts: 0 }

  for (const log of dueLogs) {
    const pm           = log.schedule.patientMedication
    const pillsPerDose = log.schedule.pillsPerDose

    let newStock: number

    if (pm.packages.length === 0) {
      // ── Fallback: no packages — direct decrement (legacy / migrated) ──
      newStock = Math.max(0, pm.pillsInStock - pillsPerDose)
      await prisma.patientMedication.update({
        where: { id: pm.id },
        data:  { pillsInStock: newStock },
      })
    } else {
      // ── FIFO package deduction ──
      let remaining = pillsPerDose

      for (const pkg of pm.packages) {
        if (remaining <= 0) break

        const deduct = Math.min(pkg.quantity, remaining)
        const newQty = pkg.quantity - deduct

        if (newQty <= 0) {
          // Package exhausted — delete it
          await prisma.medicationPackage.delete({ where: { id: pkg.id } })
        } else {
          await prisma.medicationPackage.update({
            where: { id: pkg.id },
            data:  { quantity: newQty },
          })
        }

        remaining -= deduct
      }

      // Sync pillsInStock from remaining packages
      newStock = await syncPillsInStock(pm.id)
    }

    await prisma.doseLog.update({
      where: { id: log.id },
      data: {
        status:           "TAKEN",
        takenAt:          now,
        pillsDecremented: pillsPerDose,
      },
    })

    await prisma.inventoryEvent.create({
      data: {
        patientMedicationId: pm.id,
        type:                "DECREMENT",
        quantity:            -pillsPerDose,
        reason:              "Auto-decrement (scheduled)",
      },
    })

    results.processed++

    // ── Low-stock check ──
    const avgDaily = calcAvgDailyPills({
      timesOfDay:   parseJsonArray(log.schedule.timesOfDay, ["08:00"]),
      daysOfWeek:   parseJsonArray(log.schedule.daysOfWeek, [1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: log.schedule.pillsPerDose,
      startDate:    log.schedule.startDate,
    })
    const daysLeft = calcDaysRemaining(newStock, avgDaily)

    if (daysLeft <= pm.lowStockThreshold) {
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
