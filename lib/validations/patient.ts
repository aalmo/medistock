import { z } from 'zod';

export const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  notes: z.string().max(1000).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export type PatientFormData = z.infer<typeof patientSchema>;

