// Core business logic: inventory calculations and schedule management
import { addDays, startOfDay, endOfDay } from 'date-fns';

export type UnitType = 'pill' | 'inhalation' | 'tablet' | 'ml' | 'drop' | 'patch' | 'injection' | 'other'

export interface ScheduleConfig {
  timesOfDay: string[] | string;
  daysOfWeek: number[] | string;
  pillsPerDose: number;   // now float — e.g. 0.5, 1, 2
  startDate: Date;
  endDate?: Date | null;
}

// Parse array fields stored as JSON strings in SQLite
export function parseJsonArray<T>(val: T[] | string | undefined | null, fallback: T[]): T[] {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string); } catch { return fallback; }
}

/**
 * Compute total individual doses/units in stock from containers.
 * e.g. 10 bottles × 100 inhalations = 1000 inhalations total
 */
export function computeTotalUnitsFromContainers(
  containersInStock: number,
  dosesPerContainer: number
): number {
  return containersInStock * dosesPerContainer
}

/**
 * Compute containers remaining from total units.
 * e.g. 850 inhalations ÷ 100 per bottle = 8.5 bottles
 */
export function computeContainersRemaining(
  totalUnitsInStock: number,
  dosesPerContainer: number
): number {
  if (dosesPerContainer <= 0) return 0
  return totalUnitsInStock / dosesPerContainer
}

/**
 * Generate dose timestamps for a given date range
 */
export function generateDoseTimes(
  schedule: ScheduleConfig,
  fromDate: Date,
  toDate: Date
): Date[] {
  const times = parseJsonArray<string>(schedule.timesOfDay, ['08:00']);
  const days = parseJsonArray<number>(schedule.daysOfWeek, [1,2,3,4,5,6,7]);
  const doseTimes: Date[] = [];
  let current = startOfDay(fromDate);
  const end = endOfDay(toDate);

  while (current <= end) {
    const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
    if (days.includes(dayOfWeek)) {
      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        const doseTime = new Date(current);
        doseTime.setHours(hours, minutes, 0, 0);
        if (doseTime >= schedule.startDate &&
            (!schedule.endDate || doseTime <= schedule.endDate)) {
          doseTimes.push(doseTime);
        }
      }
    }
    current = addDays(current, 1);
  }
  return doseTimes;
}

/**
 * Average units consumed per day (supports fractional doses e.g. 0.5 pills/dose)
 */
export function calcAvgDailyPills(schedule: ScheduleConfig): number {
  const times = parseJsonArray<string>(schedule.timesOfDay, ['08:00']);
  const days = parseJsonArray<number>(schedule.daysOfWeek, [1,2,3,4,5,6,7]);
  const daysPerWeek = days.length;
  const unitsPerActiveDay = times.length * schedule.pillsPerDose;
  return (daysPerWeek / 7) * unitsPerActiveDay;
}

/**
 * Days remaining based on current stock and average daily consumption
 */
export function calcDaysRemaining(unitsInStock: number, avgDailyUnits: number): number {
  if (avgDailyUnits <= 0) return Infinity;
  if (unitsInStock <= 0) return 0;
  return Math.floor(unitsInStock / avgDailyUnits);
}

export function isLowStock(unitsInStock: number, avgDailyUnits: number, thresholdDays: number): boolean {
  return calcDaysRemaining(unitsInStock, avgDailyUnits) <= thresholdDays;
}

export function calcAdherenceRate(taken: number, missed: number, skipped = 0): number {
  const total = taken + missed + skipped;
  if (total === 0) return 100;
  return Math.round((taken / (taken + missed)) * 100);
}

export function getFrequencyLabel(timesPerDay: number): string {
  switch (timesPerDay) {
    case 1: return 'Once daily';
    case 2: return 'Twice daily (BID)';
    case 3: return 'Three times daily (TID)';
    case 4: return 'Four times daily (QID)';
    default: return `${timesPerDay}× daily`;
  }
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getStockStatus(
  unitsInStock: number,
  avgDailyUnits: number,
  thresholdDays: number
): 'critical' | 'low' | 'ok' {
  const days = calcDaysRemaining(unitsInStock, avgDailyUnits);
  if (days <= 3) return 'critical';
  if (days <= thresholdDays) return 'low';
  return 'ok';
}

/** Human-readable unit label (singular / plural) */
export function unitLabel(unitType: string, count?: number): string {
  const labels: Record<string, [string, string]> = {
    pill:        ['pill',        'pills'],
    inhalation:  ['inhalation',  'inhalations'],
    tablet:      ['tablet',      'tablets'],
    ml:          ['ml',          'ml'],
    drop:        ['drop',        'drops'],
    patch:       ['patch',       'patches'],
    injection:   ['injection',   'injections'],
    other:       ['unit',        'units'],
  }
  const [singular, plural] = labels[unitType] ?? ['unit', 'units']
  if (count === undefined) return plural
  return count === 1 ? singular : plural
}

/** Container label e.g. "bottle", "inhaler", "vial", "box" */
export function containerLabel(unitType: string): string {
  const map: Record<string, string> = {
    inhalation: 'inhaler/bottle',
    ml:         'bottle',
    drop:       'bottle',
    injection:  'vial',
    patch:      'box',
  }
  return map[unitType] ?? 'container'
}
