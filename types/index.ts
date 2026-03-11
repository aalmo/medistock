import { Patient, Medication, PatientMedication, Schedule, DoseLog, Notification, User } from '@prisma/client';

// Extended types with relations
export type PatientWithMedications = Patient & {
  patientMedications: (PatientMedication & {
    medication: Medication;
    schedules: Schedule[];
  })[];
};

export type PatientMedicationWithDetails = PatientMedication & {
  medication: Medication;
  patient: Patient;
  schedules: (Schedule & { doseLogs: DoseLog[] })[];
};

export type ScheduleWithLogs = Schedule & {
  doseLogs: DoseLog[];
  patientMedication: PatientMedication & {
    medication: Medication;
    patient: Patient;
  };
};

// Dashboard KPIs
export interface DashboardKPIs {
  totalPatients: number;
  dueTodayCount: number;
  lowStockCount: number;
  adherenceRate: number;
  upcomingDoses: UpcomingDose[];
}

export interface UpcomingDose {
  id: string;
  patientName: string;
  medicationName: string;
  scheduledAt: Date;
  pillsPerDose: number;
  status: string;
}

// Inventory
export interface InventoryItem {
  patientMedicationId: string;
  patientId: string;
  patientName: string;
  medicationId: string;
  medicationName: string;
  pillsInStock: number;
  avgDailyPills: number;
  daysRemaining: number;
  lowStockThreshold: number;
  stockStatus: 'ok' | 'low' | 'critical';
}

// API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Session user extended
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
}

// Notification with context
export type NotificationWithContext = Notification & {
  patient?: Patient | null;
};

