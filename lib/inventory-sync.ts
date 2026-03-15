/**
 * Server-only inventory sync utilities.
 * Never import this from client components.
 */
import { prisma } from "@/lib/prisma"
import { startOfDay } from "date-fns"

/**
 * Recompute pillsInStock for a PatientMedication from its non-expired packages.
 *
 * Called after any mutation that creates, updates, or deletes a MedicationPackage
 * so that pillsInStock always reflects the sum of usable (non-expired) units.
 *
 * Returns the new pillsInStock value.
 */
export async function syncPillsInStock(pmId: string): Promise<number> {
  const todayStart = startOfDay(new Date())

  const packages = await prisma.medicationPackage.findMany({
    where: {
      patientMedicationId: pmId,
      expiryDate: { gte: todayStart },
    },
    select: { quantity: true },
  })

  const total = packages.reduce((sum, pkg) => sum + pkg.quantity, 0)

  await prisma.patientMedication.update({
    where: { id: pmId },
    data:  { pillsInStock: total },
  })

  return total
}

