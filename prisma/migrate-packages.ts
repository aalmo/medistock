/**
 * One-time migration: create a placeholder MedicationPackage for every
 * PatientMedication that has pillsInStock > 0 but no packages yet.
 *
 * Run once:
 *   npx ts-node --project tsconfig.json prisma/migrate-packages.ts
 *
 * The placeholder expiry is set to today + 2 years.
 * ⚠️  Update the expiry dates in /packages after running this script.
 */
import { PrismaClient } from "@prisma/client"
import { addYears, startOfDay } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Starting package migration...")

  const placeholderExpiry = addYears(startOfDay(new Date()), 2)

  const pms = await prisma.patientMedication.findMany({
    where: { pillsInStock: { gt: 0 } },
    include: {
      medication: { select: { name: true } },
      patient:    { select: { name: true } },
      packages:   { select: { id: true } },
    },
  })

  let created = 0
  let skipped = 0

  for (const pm of pms) {
    if (pm.packages.length > 0) {
      console.log(`  ⏭  Skipping ${pm.patient.name} / ${pm.medication.name} — already has ${pm.packages.length} package(s)`)
      skipped++
      continue
    }

    await prisma.medicationPackage.create({
      data: {
        patientMedicationId: pm.id,
        quantity:            pm.pillsInStock,
        expiryDate:          placeholderExpiry,
        unitType:            pm.unitType,
        notes:               "Migrated from legacy stock — please update the expiry date",
      },
    })

    console.log(
      `  ✅ Created package for ${pm.patient.name} / ${pm.medication.name}` +
      ` — ${pm.pillsInStock} ${pm.unitType}(s), expiry ${placeholderExpiry.toISOString().slice(0, 10)}`
    )
    created++
  }

  console.log(`\n✅ Migration complete. Created: ${created}, Skipped (already had packages): ${skipped}`)
  console.log(`⚠️  Remember to update placeholder expiry dates in /packages!`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

