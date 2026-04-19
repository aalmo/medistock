import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from '@/lib/i18n/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, locale: Locale = 'en'): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;

  // Use explicit Gregorian calendar for Arabic to avoid Hijri
  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    de: 'de-DE',
    ar: 'ar-SA-u-ca-gregory'  // Gregorian calendar with Arabic language
  };

  return d.toLocaleDateString(localeMap[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    calendar: 'gregory'  // Explicitly use Gregorian calendar
  });
}

export function formatDateTime(date: Date | string | null | undefined, locale: Locale = 'en'): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;

  // Use explicit Gregorian calendar for Arabic to avoid Hijri
  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    de: 'de-DE',
    ar: 'ar-SA-u-ca-gregory'  // Gregorian calendar with Arabic language
  };

  return d.toLocaleString(localeMap[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale !== 'de',
    calendar: 'gregory'  // Explicitly use Gregorian calendar
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

