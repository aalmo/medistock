import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, addDays, format } from "date-fns"
import {
  calcAvgDailyPills,
  getStockStatus,
  parseJsonArray,
  generateDoseTimes,
} from "@/lib/calculations"
import { runAutoComplete } from "@/lib/auto-complete"

function computeAdherence(taken: number, missed: number): number {
  const total = taken + missed
  if (total === 0) return 100
  return Math.round((taken / total) * 100)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // ── Auto-complete any overdue PENDING doses first ────────────────────────
  // This runs inline so it works without a cron server in local dev.
  // It marks past-due PENDING doses as TAKEN and decrements inventory.
  await runAutoComplete()

  // ── Auto-generate missing dose logs so dashboard is never empty ──────────
  const activeSchedules = await prisma.schedule.findMany({
    where: { active: true, patientMedication: { patient: { userId }, active: true } },
  })
  for (const sch of activeSchedules) {
    const futureLogs = await prisma.doseLog.count({
      where: { scheduleId: sch.id, scheduledAt: { gte: todayStart, lte: addDays(now, 7) } },
    })
    if (futureLogs > 0) continue
    const timesOfDay = parseJsonArray<string>(sch.timesOfDay as string, ["08:00"])
    const daysOfWeek = parseJsonArray<number>(sch.daysOfWeek as string, [1, 2, 3, 4, 5, 6, 7])
    const doseTimes  = generateDoseTimes(
      { timesOfDay, daysOfWeek, pillsPerDose: sch.pillsPerDose, startDate: sch.startDate, endDate: sch.endDate ?? undefined },
      now, addDays(now, 30),
    )
    if (doseTimes.length > 0) {
      // SQLite does not support skipDuplicates — filter out already-existing timestamps
      const existing = await prisma.doseLog.findMany({
        where: {
          scheduleId:  sch.id,
          scheduledAt: { in: doseTimes },
        },
        select: { scheduledAt: true },
      })
      const existingSet = new Set(existing.map(e => e.scheduledAt.getTime()))
      const newDoses = doseTimes.filter(dt => !existingSet.has(dt.getTime()))
      if (newDoses.length > 0) {
        await prisma.doseLog.createMany({
          data: newDoses.map(dt => ({
            scheduleId: sch.id, scheduledAt: dt, status: "PENDING", pillsDecremented: 0,
          })),
        })
      }
    }
  }

  // 1. Counts
  const totalPatients = await prisma.patient.count({ where: { userId } })
  const [todayDoses, todayTaken, todayPending] = await Promise.all([
    prisma.doseLog.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, schedule: { patientMedication: { patient: { userId } } } } }),
    prisma.doseLog.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: "TAKEN",   schedule: { patientMedication: { patient: { userId } } } } }),
    prisma.doseLog.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: "PENDING", schedule: { patientMedication: { patient: { userId } } } } }),
  ])

  // 2. Adherence
  const thirtyDaysAgo = subDays(now, 30)
  const recentLogs = await prisma.doseLog.groupBy({
    by: ["status"],
    where: { scheduledAt: { gte: thirtyDaysAgo, lte: now }, schedule: { patientMedication: { patient: { userId } } } },
    _count: { status: true },
  })
  const takenCount  = recentLogs.find(l => l.status === "TAKEN")?._count.status  ?? 0
  const missedCount = recentLogs.find(l => l.status === "MISSED")?._count.status ?? 0
  const adherenceRate = computeAdherence(takenCount, missedCount)

  // 3. Low stock
  const patients = await prisma.patient.findMany({
    where: { userId },
    include: { patientMedications: { where: { active: true }, include: { medication: true, schedules: { where: { active: true } } } } },
  })
  let lowStockCount = 0
  const inventoryChartData: { name: string; pills: number; threshold: number }[] = []
  for (const p of patients) {
    for (const pm of p.patientMedications) {
      const avgDaily = pm.schedules.reduce((s, sch) =>
        s + calcAvgDailyPills({
          timesOfDay: parseJsonArray(sch.timesOfDay as string, ["08:00"]),
          daysOfWeek: parseJsonArray(sch.daysOfWeek as string, [1,2,3,4,5,6,7]),
          pillsPerDose: sch.pillsPerDose, startDate: sch.startDate,
        }), 0)
      if (getStockStatus(pm.pillsInStock, avgDaily, pm.lowStockThreshold) !== "ok") lowStockCount++
      inventoryChartData.push({ name: pm.medication.name.slice(0, 14), pills: pm.pillsInStock, threshold: pm.lowStockPills })
    }
  }

  // 4. Upcoming (next 24h)
  const upcoming = await prisma.doseLog.findMany({
    where: { scheduledAt: { gte: now, lte: addDays(now, 1) }, status: "PENDING", schedule: { active: true, patientMedication: { patient: { userId } } } },
    include: { schedule: { include: { patientMedication: { include: { medication: true, patient: true } } } } },
    orderBy: { scheduledAt: "asc" }, take: 12,
  })

  // 5b. Expiry counts
  const userSettings = await prisma.user.findUnique({ where: { id: userId }, select: { expiryAlertDays: true } })
  const expiryAlertDays = userSettings?.expiryAlertDays ?? 30
  const expiryWindow = addDays(now, expiryAlertDays)
  const [expiredPkgCount, expiringPkgCount] = await Promise.all([
    prisma.medicationPackage.count({ where: { expiryDate: { lt: now }, patientMedication: { patient: { userId } } } }),
    prisma.medicationPackage.count({ where: { expiryDate: { gte: now, lte: expiryWindow }, patientMedication: { patient: { userId } } } }),
  ])

  // 5. Trend (7 days)
  const adherenceTrend: { date: string; adherence: number; taken: number; missed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = subDays(now, i)
    const s = startOfDay(day), e = endOfDay(day)
    const [dt, dm] = await Promise.all([
      prisma.doseLog.count({ where: { scheduledAt: { gte: s, lte: e }, status: "TAKEN",  schedule: { patientMedication: { patient: { userId } } } } }),
      prisma.doseLog.count({ where: { scheduledAt: { gte: s, lte: e }, status: "MISSED", schedule: { patientMedication: { patient: { userId } } } } }),
    ])
    adherenceTrend.push({ date: format(day, "EEE"), adherence: computeAdherence(dt, dm), taken: dt, missed: dm })
  }

  return NextResponse.json({
    data: {
      totalPatients,
      dueTodayCount: todayDoses, takenTodayCount: todayTaken, pendingTodayCount: todayPending,
      adherenceRate, lowStockCount,
      expiredPkgCount, expiringPkgCount, expiryAlertDays,
      upcomingDoses: upcoming.map(log => ({
        id: log.id,
        patientName:    log.schedule.patientMedication.patient.name,
        medicationName: log.schedule.patientMedication.medication.name,
        brandName:      log.schedule.patientMedication.medication.brandName,
        strength:       log.schedule.patientMedication.medication.strength,
        scheduledAt:    log.scheduledAt,
        pillsPerDose:   log.schedule.pillsPerDose,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unitType: (log.schedule.patientMedication as any).unitType ?? "pill",
        status:   log.status,
      })),
      adherenceTrend,
      inventoryChartData: inventoryChartData.slice(0, 8),
    },
  })
}
