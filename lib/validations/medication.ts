import { z } from 'zod';

export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required').max(200),
  brandName: z.string().optional().nullable(),
  genericName: z.string().optional().nullable(),
  form: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  unit: z.string().default('tablet'),
  rxcui: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  ingredients: z.string().optional().nullable(),
  warnings: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const patientMedicationSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  medicationId: z.string().min(1, 'Medication is required'),
  unitType: z.string().default('pill'),
  pillsInStock: z.coerce.number().min(0).default(0),
  dosesPerContainer: z.coerce.number().int().min(1).default(1),
  containersInStock: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(1).default(7),
  lowStockPills: z.coerce.number().min(1).default(14),
  notes: z.string().optional().nullable(),
});

export type MedicationFormData = z.infer<typeof medicationSchema>;
export type PatientMedicationFormData = z.infer<typeof patientMedicationSchema>;
