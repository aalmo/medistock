/**
 * Server-only inventory sync utilities.
 * Never import this from client components.
 */
import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { startOfDay } from "date-fns"
import { calcAvgDailyPills, calcEffectiveStock, parseJsonArray } from "@/lib/calculations"

// Works with both the regular PrismaClient and a transaction client
type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

/**
 * Recompute pillsInStock for a PatientMedication from its non-expired packages,
 * applying FIFO expiry-aware capping so only actually consumable units are counted.
 *
 * Called after any mutation that creates, updates, or deletes a MedicationPackage
 * so that pillsInStock always reflects usable (expiry-capped) units.
 *
 * Returns the new pillsInStock value.
 */
export async function syncPillsInStock(pmId: string, db: Db = prisma): Promise<number> {
  const todayStart = startOfDay(new Date())

  const pm = await db.patientMedication.findUnique({
    where: { id: pmId },
    include: {
      schedules: { where: { active: true } },
      packages:  {
        where:   { expiryDate: { gte: todayStart } },
        orderBy: { expiryDate: "asc" },
        select:  { quantity: true, expiryDate: true },
      },
    },
  })

  if (!pm) return 0

  const avgDaily = pm.schedules.reduce((sum, s) =>
    sum + calcAvgDailyPills({
      timesOfDay:   parseJsonArray(s.timesOfDay,  ["08:00"]),
      daysOfWeek:   parseJsonArray(s.daysOfWeek,  [1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: s.pillsPerDose,
      startDate:    s.startDate,
      endDate:      s.endDate,
    }), 0)

  const effective = calcEffectiveStock(pm.packages, avgDaily) ?? 0

  await db.patientMedication.update({
    where: { id: pmId },
    data:  { pillsInStock: effective },
  })

  return effective
}

