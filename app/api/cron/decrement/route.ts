import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, parseJsonArray } from "@/lib/calculations"
import { subMinutes } from "date-fns"

// POST /api/cron/decrement
// Called every 15 min by Vercel Cron
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowStart = subMinutes(now, 15)

  // Find PENDING dose logs that are past due
  const dueLogs = await prisma.doseLog.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: now },
      status: "PENDING",
      schedule: { active: true }
    },
    include: {
      schedule: {
        include: {
          patientMedication: {
            include: {
              patient: { include: { user: true } },
              medication: true
            }
          }
        }
      }
    }
  })

  const results = { processed: 0, lowStockAlerts: 0 }

  for (const log of dueLogs) {
    const pm = log.schedule.patientMedication
    const pillsPerDose = log.schedule.pillsPerDose

    // Auto-decrement inventory
    const newStock = Math.max(0, pm.pillsInStock - pillsPerDose)
    await prisma.patientMedication.update({
      where: { id: pm.id },
      data: { pillsInStock: newStock }
    })

    await prisma.doseLog.update({
      where: { id: log.id },
      data: {
        status: "TAKEN",
        takenAt: now,
        pillsDecremented: pillsPerDose
      }
    })

    await prisma.inventoryEvent.create({
      data: {
        patientMedicationId: pm.id,
        type: "DECREMENT",
        quantity: -pillsPerDose,
        reason: "Auto-decrement (scheduled)"
      }
    })

    results.processed++

    // Check if now low on stock
    const avgDaily = calcAvgDailyPills({
      timesOfDay: parseJsonArray(log.schedule.timesOfDay, ['08:00']),
      daysOfWeek: parseJsonArray(log.schedule.daysOfWeek, [1,2,3,4,5,6,7]),
      pillsPerDose: log.schedule.pillsPerDose,
      startDate: log.schedule.startDate
    })
    const daysLeft = calcDaysRemaining(newStock, avgDaily)

    if (daysLeft <= pm.lowStockThreshold) {
      // Check if we already sent a low-stock notif today
      const existing = await prisma.notification.findFirst({
        where: {
          userId: pm.patient.userId,
          patientId: pm.patientId,
          type: "LOW_STOCK",
          createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: pm.patient.userId,
            patientId: pm.patientId,
            type: "LOW_STOCK",
            message: `${pm.patient.name}'s ${pm.medication.name} is running low — ${newStock} pills left (~${daysLeft} days).`,
            channel: "IN_APP"
          }
        })
        results.lowStockAlerts++
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

