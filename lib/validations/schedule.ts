import { z } from 'zod';

export const scheduleSchema = z.object({
  patientMedicationId: z.string().min(1),
  frequency: z.enum(['DAILY', 'BID', 'TID', 'QID', 'WEEKLY', 'AS_NEEDED', 'CUSTOM']),
  timesOfDay: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format')).min(1),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1),
  // Allow decimal doses (0.5, 1.5 etc.)
  pillsPerDose: z.coerce.number().min(0.25).default(1),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});

export type ScheduleFormData = z.infer<typeof scheduleSchema>;

export const doseLogUpdateSchema = z.object({
  status: z.enum(['TAKEN', 'SKIPPED', 'MISSED']),
  takenAt: z.string().optional(),
  notes: z.string().optional(),
});
