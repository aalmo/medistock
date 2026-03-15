import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@medistock.app' },
    update: {},
    create: {
      email: 'demo@medistock.app',
      name: 'Dr. Demo User',
      passwordHash,
      role: 'ADMIN',
      timezone: 'America/New_York',
    },
  });
  console.log('✅ Created demo user:', user.email);

  // Create medications
  const aspirin = await prisma.medication.upsert({
    where: { id: 'med-aspirin' },
    update: {},
    create: {
      id: 'med-aspirin',
      name: 'Aspirin',
      brandName: 'Bayer',
      genericName: 'acetylsalicylic acid',
      form: 'tablet',
      strength: '81mg',
      unit: 'tablet',
      rxcui: '1191',
    },
  });

  const lisinopril = await prisma.medication.upsert({
    where: { id: 'med-lisinopril' },
    update: {},
    create: {
      id: 'med-lisinopril',
      name: 'Lisinopril',
      genericName: 'lisinopril',
      form: 'tablet',
      strength: '10mg',
      unit: 'tablet',
      rxcui: '29046',
    },
  });

  const metformin = await prisma.medication.upsert({
    where: { id: 'med-metformin' },
    update: {},
    create: {
      id: 'med-metformin',
      name: 'Metformin',
      genericName: 'metformin hydrochloride',
      form: 'tablet',
      strength: '500mg',
      unit: 'tablet',
      rxcui: '860974',
    },
  });

  console.log('✅ Created medications');

  // Create patients
  const patient1 = await prisma.patient.upsert({
    where: { id: 'pat-john' },
    update: {},
    create: {
      id: 'pat-john',
      userId: user.id,
      name: 'John Smith',
      dob: new Date('1955-03-15'),
      gender: 'MALE',
      phone: '+1 (555) 123-4567',
      notes: 'History of hypertension and type 2 diabetes',
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { id: 'pat-mary' },
    update: {},
    create: {
      id: 'pat-mary',
      userId: user.id,
      name: 'Mary Johnson',
      dob: new Date('1962-07-22'),
      gender: 'FEMALE',
      phone: '+1 (555) 987-6543',
      notes: 'Recovering from cardiac event',
    },
  });

  console.log('✅ Created patients');

  // Assign medications to patients
  const pm1 = await prisma.patientMedication.upsert({
    where: { id: 'pm-john-aspirin' },
    update: {},
    create: {
      id: 'pm-john-aspirin',
      patientId: patient1.id,
      medicationId: aspirin.id,
      pillsInStock: 45,
      lowStockThreshold: 7,
      lowStockPills: 14,
    },
  });

  const pm2 = await prisma.patientMedication.upsert({
    where: { id: 'pm-john-lisinopril' },
    update: {},
    create: {
      id: 'pm-john-lisinopril',
      patientId: patient1.id,
      medicationId: lisinopril.id,
      pillsInStock: 8,
      lowStockThreshold: 7,
      lowStockPills: 14,
    },
  });

  const pm3 = await prisma.patientMedication.upsert({
    where: { id: 'pm-mary-metformin' },
    update: {},
    create: {
      id: 'pm-mary-metformin',
      patientId: patient2.id,
      medicationId: metformin.id,
      pillsInStock: 60,
      lowStockThreshold: 7,
      lowStockPills: 14,
    },
  });

  const pm4 = await prisma.patientMedication.upsert({
    where: { id: 'pm-mary-aspirin' },
    update: {},
    create: {
      id: 'pm-mary-aspirin',
      patientId: patient2.id,
      medicationId: aspirin.id,
      pillsInStock: 5,
      lowStockThreshold: 7,
      lowStockPills: 14,
    },
  });

  console.log('✅ Assigned medications to patients');

  // Create schedules
  await prisma.schedule.upsert({
    where: { id: 'sch-john-aspirin' },
    update: {},
    create: {
      id: 'sch-john-aspirin',
      patientMedicationId: pm1.id,
      frequency: 'DAILY',
      timesOfDay: JSON.stringify(['08:00']),
      daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: 1,
      startDate: new Date('2024-01-01'),
    },
  });

  await prisma.schedule.upsert({
    where: { id: 'sch-john-lisinopril' },
    update: {},
    create: {
      id: 'sch-john-lisinopril',
      patientMedicationId: pm2.id,
      frequency: 'DAILY',
      timesOfDay: JSON.stringify(['08:00']),
      daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: 1,
      startDate: new Date('2024-01-01'),
    },
  });

  await prisma.schedule.upsert({
    where: { id: 'sch-mary-metformin' },
    update: {},
    create: {
      id: 'sch-mary-metformin',
      patientMedicationId: pm3.id,
      frequency: 'BID',
      timesOfDay: JSON.stringify(['08:00', '20:00']),
      daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: 1,
      startDate: new Date('2024-01-01'),
    },
  });

  await prisma.schedule.upsert({
    where: { id: 'sch-mary-aspirin' },
    update: {},
    create: {
      id: 'sch-mary-aspirin',
      patientMedicationId: pm4.id,
      frequency: 'DAILY',
      timesOfDay: JSON.stringify(['08:00']),
      daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      pillsPerDose: 1,
      startDate: new Date('2024-01-01'),
    },
  });

  console.log('✅ Created schedules');

  // ── Demo packages ──────────────────────────────────────────────────────
  const today = new Date()
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

  const demoPackages = [
    { patientMedicationId: pm1.id, quantity: 5,  expiryDate: addDays(today, 5),   unitType: "tablet", lotNumber: "LOT-A001", notes: "Nearly expired — demo FIFO package" },
    { patientMedicationId: pm1.id, quantity: 40, expiryDate: addDays(today, 180), unitType: "tablet", lotNumber: "LOT-A002", notes: null },
    { patientMedicationId: pm2.id, quantity: 8,  expiryDate: addDays(today, 60),  unitType: "tablet", lotNumber: "LOT-L001", notes: null },
    { patientMedicationId: pm3.id, quantity: 60, expiryDate: addDays(today, 90),  unitType: "tablet", lotNumber: "LOT-M001", notes: null },
    { patientMedicationId: pm4.id, quantity: 5,  expiryDate: addDays(today, 14),  unitType: "tablet", lotNumber: "LOT-A003", notes: null },
  ]

  for (const pkg of demoPackages) {
    await prisma.medicationPackage.create({ data: pkg })
  }

  // Sync pillsInStock for all seeded PMs to match their packages
  for (const pmId of [pm1.id, pm2.id, pm3.id, pm4.id]) {
    const pkgs = await prisma.medicationPackage.findMany({
      where:  { patientMedicationId: pmId, expiryDate: { gte: today } },
      select: { quantity: true },
    })
    const total = pkgs.reduce((sum, p) => sum + p.quantity, 0)
    await prisma.patientMedication.update({
      where: { id: pmId },
      data:  { pillsInStock: total },
    })
  }

  console.log('✅ Created demo packages');
  console.log('🎉 Seeding complete!');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@medistock.app');
  console.log('  Password: demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

