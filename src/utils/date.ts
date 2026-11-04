// Date range utilities for period calculations
// IMPORTANT: All date string outputs use LOCAL timezone, not UTC!
// Never use toISOString() for date strings - it returns UTC.

import type { Period } from '../types';
import { toDateString } from './format';

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get the start of day (00:00:00) in local timezone
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of week (respects weekStart setting)
 */
function startOfWeek(date: Date, weekStart: 'mon' | 'sun' = 'mon'): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStart === 'mon'
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  d.setDate(d.getDate() + diff);
  return startOfDay(d);
}

/**
 * Get start of month
 */
function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  return startOfDay(d);
}

/**
 * Get start of year
 */
function startOfYear(date: Date): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  return startOfDay(d);
}

/**
 * Get date range for a period
 */
export function getPeriodRange(
  period: Period,
  referenceDate: Date = new Date(),
  weekStart: 'mon' | 'sun' = 'mon'
): DateRange {
  const now = startOfDay(referenceDate);

  switch (period) {
    case 'daily': {
      const start = startOfDay(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(-1);
      return { start, end };
    }

    case 'weekly': {
      const start = startOfWeek(now, weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setMilliseconds(-1);
      return { start, end };
    }

    case 'monthly': {
      const start = startOfMonth(now);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setMilliseconds(-1);
      return { start, end };
    }

    case 'annually': {
      const start = startOfYear(now);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setMilliseconds(-1);
      return { start, end };
    }
  }
}

/**
 * Get previous period range (for comparison)
 */
export function getPreviousPeriodRange(
  period: Period,
  referenceDate: Date = new Date(),
  weekStart: 'mon' | 'sun' = 'mon'
): DateRange {
  const current = getPeriodRange(period, referenceDate, weekStart);
  const diff = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - diff - 1),
    end: new Date(current.start.getTime() - 1),
  };
}

/**
 * Format date range to YYYY-MM-DD strings for SQL queries (LOCAL timezone)
 * Uses the centralized toDateString() to avoid timezone bugs
 */
export function getRangeStrings(range: DateRange): { startDate: string; endDate: string } {
  return {
    startDate: toDateString(range.start),
    endDate: toDateString(range.end),
  };
}

/**
 * Get period key for budget lookups (e.g., "2026-10", "2026-W44", "2026-10-31")
 */
export function getPeriodKey(
  period: Period,
  date: Date = new Date(),
  weekStart: 'mon' | 'sun' = 'mon'
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly': {
      const weekNum = getWeekNumber(date);
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    }
    case 'monthly':
      return `${year}-${month}`;
    case 'annually':
      return `${year}`;
  }
}

/**
 * Get period label for display
 */
export function getPeriodLabel(period: Period, date: Date = new Date()): string {
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  switch (period) {
    case 'daily':
      return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
    case 'weekly':
      return `Tuần ${getWeekNumber(date)}, ${date.getFullYear()}`;
    case 'monthly':
      return `${months[date.getMonth()]}, ${date.getFullYear()}`;
    case 'annually':
      return `Năm ${date.getFullYear()}`;
  }
}

/**
 * Get ISO week number
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Generate labels for chart time series
 */
export function getChartLabels(period: Period, count: number = 6): string[] {
  const labels: string[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    // Set to 1st of month to avoid overflow when changing months
    d.setDate(1);

    switch (period) {
      case 'daily':
        d.setDate(now.getDate() - i);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
        break;
      case 'weekly':
        d.setDate(now.getDate() - i * 7);
        labels.push(`T${getWeekNumber(d)}`);
        break;
      case 'monthly':
        d.setMonth(now.getMonth() - i);
        labels.push(`T${d.getMonth() + 1}/${d.getFullYear() % 100}`);
        break;
      case 'annually':
        d.setFullYear(now.getFullYear() - i);
        labels.push(`${d.getFullYear()}`);
        break;
    }
  }

  return labels;
}
