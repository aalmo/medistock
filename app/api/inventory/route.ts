import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcAvgDailyPills, calcDaysRemaining, getStockStatus, parseJsonArray } from "@/lib/calculations"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const lowStockOnly = searchParams.get("lowStock") === "true"

  const patients = await prisma.patient.findMany({
    where: { userId },
    include: {
      patientMedications: {
        where: { active: true },
        include: {
          medication: true,
          schedules: { where: { active: true } }
        }
      }
    }
  })

  const inventory = patients.flatMap(patient =>
    patient.patientMedications.map(pm => {
      const avgDaily = pm.schedules.reduce((sum, s) =>
        sum + calcAvgDailyPills({
          timesOfDay: parseJsonArray(s.timesOfDay, ['08:00']),
          daysOfWeek: parseJsonArray(s.daysOfWeek, [1,2,3,4,5,6,7]),
          pillsPerDose: s.pillsPerDose,
          startDate: s.startDate,
          endDate: s.endDate,
        }), 0)

      const daysRemaining = calcDaysRemaining(pm.pillsInStock, avgDaily)
      const stockStatus = getStockStatus(pm.pillsInStock, avgDaily, pm.lowStockThreshold)

      return {
        patientMedicationId: pm.id,
        patientId: patient.id,
        patientName: patient.name,
        medicationId: pm.medicationId,
        medicationName: pm.medication.name,
        medicationStrength: pm.medication.strength,
        medicationForm: pm.medication.form,
        pillsInStock: pm.pillsInStock,
        avgDailyPills: Math.round(avgDaily * 10) / 10,
        daysRemaining: isFinite(daysRemaining) ? daysRemaining : 999,
        lowStockThreshold: pm.lowStockThreshold,
        lowStockPills: pm.lowStockPills,
        stockStatus,
      }
    })
  )

  const filtered = lowStockOnly
    ? inventory.filter(i => i.stockStatus !== "ok")
    : inventory

  return NextResponse.json({ data: filtered })
}

