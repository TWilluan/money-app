// Period budget operations

import { getDatabase } from './database';
import type { Period, Currency } from '../types';

export interface PeriodBudget {
  id: number;
  periodType: Period;
  periodKey: string;
  limitAmount: number;
  currency: Currency;
  createdAt: string;
}

interface PeriodBudgetRow {
  id: number;
  period_type: string;
  period_key: string;
  limit_amount: number;
  currency: string;
  created_at: string;
}

function mapRow(row: PeriodBudgetRow): PeriodBudget {
  return {
    id: row.id,
    periodType: row.period_type as Period,
    periodKey: row.period_key,
    limitAmount: row.limit_amount,
    currency: (row.currency || 'VND') as Currency,
    createdAt: row.created_at,
  };
}

/**
 * Generate period key from date
 * - daily: "2024-01-15"
 * - weekly: "2024-W03"
 * - monthly: "2024-01"
 * - annually: "2024"
 */
export function generatePeriodKey(periodType: Period, date: Date, weekStart: 'mon' | 'sun' = 'mon'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (periodType) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly':
      return getWeekKey(date, weekStart);
    case 'monthly':
      return `${year}-${month}`;
    case 'annually':
      return `${year}`;
  }
}

function getWeekKey(date: Date, weekStart: 'mon' | 'sun'): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const startOffset = weekStart === 'mon' ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;
  d.setDate(d.getDate() + startOffset);

  // Get ISO week number
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);

  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get budget for a specific period
 */
export async function getPeriodBudget(
  periodType: Period,
  periodKey: string
): Promise<PeriodBudget | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PeriodBudgetRow>(
    'SELECT * FROM period_budgets WHERE period_type = ? AND period_key = ?',
    [periodType, periodKey]
  );
  if (row) {
    console.log('[getPeriodBudget] Raw row:', JSON.stringify(row));
    const mapped = mapRow(row);
    console.log('[getPeriodBudget] Mapped:', JSON.stringify(mapped));
    return mapped;
  }
  return null;
}

/**
 * Get current period budget based on today's date
 */
export async function getCurrentPeriodBudget(
  periodType: Period,
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<PeriodBudget | null> {
  const periodKey = generatePeriodKey(periodType, new Date(), weekStart);
  return getPeriodBudget(periodType, periodKey);
}

/**
 * Set budget for a specific period (upsert)
 */
export async function setPeriodBudget(
  periodType: Period,
  periodKey: string,
  limitAmount: number,
  currency: Currency = 'VND'
): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO period_budgets (period_type, period_key, limit_amount, currency, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(period_type, period_key) DO UPDATE SET limit_amount = excluded.limit_amount, currency = excluded.currency`,
    [periodType, periodKey, limitAmount, currency, now]
  );

  return result.lastInsertRowId;
}

/**
 * Delete a period budget
 */
export async function deletePeriodBudget(
  periodType: Period,
  periodKey: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM period_budgets WHERE period_type = ? AND period_key = ?',
    [periodType, periodKey]
  );
}

/**
 * Get all budgets for a period type (for history/listing)
 */
export async function getPeriodBudgetHistory(
  periodType: Period,
  limit: number = 12
): Promise<PeriodBudget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PeriodBudgetRow>(
    `SELECT * FROM period_budgets
     WHERE period_type = ?
     ORDER BY period_key DESC
     LIMIT ?`,
    [periodType, limit]
  );
  return rows.map(mapRow);
}

/**
 * Copy budget from previous period to current (for convenience)
 */
export async function copyFromPreviousPeriod(
  periodType: Period,
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<number | null> {
  const history = await getPeriodBudgetHistory(periodType, 1);
  if (history.length === 0) return null;

  const currentKey = generatePeriodKey(periodType, new Date(), weekStart);
  if (history[0].periodKey === currentKey) return null; // Already has budget

  return setPeriodBudget(periodType, currentKey, history[0].limitAmount);
}

/**
 * Get budget limits for parent periods to enforce constraints
 * daily < weekly < monthly < yearly
 */
export async function getParentPeriodBudgets(
  periodType: Period,
  date: Date = new Date(),
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<{ maxLimit: number | null; parentBudgets: { period: Period; limit: number }[] }> {
  const parentPeriods: Period[] = [];

  // Determine parent periods (larger time ranges)
  switch (periodType) {
    case 'daily':
      parentPeriods.push('weekly', 'monthly', 'annually');
      break;
    case 'weekly':
      parentPeriods.push('monthly', 'annually');
      break;
    case 'monthly':
      parentPeriods.push('annually');
      break;
    case 'annually':
      // No parent
      break;
  }

  const parentBudgets: { period: Period; limit: number }[] = [];

  for (const parentPeriod of parentPeriods) {
    const parentKey = generatePeriodKey(parentPeriod, date, weekStart);
    const parentBudget = await getPeriodBudget(parentPeriod, parentKey);
    if (parentBudget) {
      parentBudgets.push({ period: parentPeriod, limit: parentBudget.limitAmount });
    }
  }

  // Max limit is the smallest parent budget (if any)
  const maxLimit = parentBudgets.length > 0
    ? Math.min(...parentBudgets.map(p => p.limit))
    : null;

  return { maxLimit, parentBudgets };
}

/**
 * Get budget limits for child periods to enforce constraints
 * daily < weekly < monthly < yearly
 */
export async function getChildPeriodBudgets(
  periodType: Period,
  date: Date = new Date(),
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<{ minLimit: number | null; childBudgets: { period: Period; limit: number }[] }> {
  const childPeriods: Period[] = [];

  // Determine child periods (smaller time ranges)
  switch (periodType) {
    case 'annually':
      childPeriods.push('monthly', 'weekly', 'daily');
      break;
    case 'monthly':
      childPeriods.push('weekly', 'daily');
      break;
    case 'weekly':
      childPeriods.push('daily');
      break;
    case 'daily':
      // No children
      break;
  }

  const childBudgets: { period: Period; limit: number }[] = [];

  for (const childPeriod of childPeriods) {
    const childKey = generatePeriodKey(childPeriod, date, weekStart);
    const childBudget = await getPeriodBudget(childPeriod, childKey);
    if (childBudget) {
      childBudgets.push({ period: childPeriod, limit: childBudget.limitAmount });
    }
  }

  // Min limit is the largest child budget (if any)
  const minLimit = childBudgets.length > 0
    ? Math.max(...childBudgets.map(p => p.limit))
    : null;

  return { minLimit, childBudgets };
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'ngày',
  weekly: 'tuần',
  monthly: 'tháng',
  annually: 'năm',
};

/**
 * Parse period key back to date range
 */
function parsePeriodKeyToDateRange(
  periodType: Period,
  periodKey: string,
  weekStart: 'mon' | 'sun'
): { startDate: Date; endDate: Date } {
  switch (periodType) {
    case 'daily': {
      const date = new Date(periodKey);
      return { startDate: date, endDate: date };
    }
    case 'weekly': {
      // periodKey format: "2024-W03"
      const [yearStr, weekStr] = periodKey.split('-W');
      const year = parseInt(yearStr, 10);
      const week = parseInt(weekStr, 10);

      // Find first day of the week
      const jan1 = new Date(year, 0, 1);
      const daysToAdd = (week - 1) * 7;
      const weekDate = new Date(jan1.getTime() + daysToAdd * 86400000);

      // Adjust to week start
      const dayOfWeek = weekDate.getDay();
      const startOffset = weekStart === 'mon'
        ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
        : -dayOfWeek;

      const startDate = new Date(weekDate);
      startDate.setDate(startDate.getDate() + startOffset);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      return { startDate, endDate };
    }
    case 'monthly': {
      // periodKey format: "2024-01"
      const [yearStr, monthStr] = periodKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month

      return { startDate, endDate };
    }
    case 'annually': {
      // periodKey format: "2024"
      const year = parseInt(periodKey, 10);
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      return { startDate, endDate };
    }
  }
}

/**
 * Get direct child period type
 */
function getDirectChildPeriodType(parentPeriodType: Period): Period | null {
  switch (parentPeriodType) {
    case 'annually': return 'monthly';
    case 'monthly': return 'weekly';
    case 'weekly': return 'daily';
    case 'daily': return null;
  }
}

/**
 * Get direct parent period type
 */
function getDirectParentPeriodType(childPeriodType: Period): Period | null {
  switch (childPeriodType) {
    case 'daily': return 'weekly';
    case 'weekly': return 'monthly';
    case 'monthly': return 'annually';
    case 'annually': return null;
  }
}

/**
 * Get sum of all child budgets within a parent period
 * e.g., sum of all daily budgets in a specific week
 */
async function getChildBudgetsSumInPeriod(
  parentPeriodType: Period,
  parentPeriodKey: string,
  childPeriodType: Period,
  weekStart: 'mon' | 'sun',
  excludePeriodKey?: string // Exclude this key when updating existing budget
): Promise<number> {
  const db = await getDatabase();
  const { startDate, endDate } = parsePeriodKeyToDateRange(parentPeriodType, parentPeriodKey, weekStart);

  // Generate all possible child period keys within the parent period range
  const childKeys: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const childKey = generatePeriodKey(childPeriodType, current, weekStart);
    if (!childKeys.includes(childKey) && childKey !== excludePeriodKey) {
      childKeys.push(childKey);
    }

    // Move to next period
    switch (childPeriodType) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setFullYear(current.getFullYear() + 1);
    }
  }

  if (childKeys.length === 0) return 0;

  const placeholders = childKeys.map(() => '?').join(',');
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(limit_amount) as total FROM period_budgets
     WHERE period_type = ? AND period_key IN (${placeholders})`,
    [childPeriodType, ...childKeys]
  );

  return result?.total ?? 0;
}

/**
 * Validate budget amount against hierarchy constraints
 * - New child budget + existing siblings must not exceed parent budget
 * - New parent budget must be >= sum of existing children
 * Returns error message if invalid, null if valid
 */
export async function validateBudgetAmount(
  periodType: Period,
  periodKey: string,
  amount: number,
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<string | null> {
  // Parse date from period key for parent/child lookups
  const { startDate: date } = parsePeriodKeyToDateRange(periodType, periodKey, weekStart);

  // 1. Check against direct parent budget (sum validation)
  const parentPeriodType = getDirectParentPeriodType(periodType);
  if (parentPeriodType) {
    const parentPeriodKey = generatePeriodKey(parentPeriodType, date, weekStart);
    const parentBudget = await getPeriodBudget(parentPeriodType, parentPeriodKey);

    if (parentBudget) {
      // Get sum of all sibling budgets (excluding current if updating)
      const siblingsSum = await getChildBudgetsSumInPeriod(
        parentPeriodType,
        parentPeriodKey,
        periodType,
        weekStart,
        periodKey // Exclude current period key
      );

      const totalWithNew = siblingsSum + amount;

      if (totalWithNew > parentBudget.limitAmount) {
        const remaining = parentBudget.limitAmount - siblingsSum;
        return `Tổng hạn mức ${PERIOD_LABELS[periodType]} trong ${PERIOD_LABELS[parentPeriodType]} không được vượt quá ${parentBudget.limitAmount.toLocaleString('vi-VN')} ₫. Còn lại: ${remaining.toLocaleString('vi-VN')} ₫`;
      }
    }
  }

  // 2. Check that new amount >= sum of existing children
  const childPeriodType = getDirectChildPeriodType(periodType);
  if (childPeriodType) {
    const childrenSum = await getChildBudgetsSumInPeriod(
      periodType,
      periodKey,
      childPeriodType,
      weekStart
    );

    if (childrenSum > 0 && amount < childrenSum) {
      return `Hạn mức ${PERIOD_LABELS[periodType]} phải >= tổng hạn mức ${PERIOD_LABELS[childPeriodType]} đã đặt (${childrenSum.toLocaleString('vi-VN')} ₫)`;
    }
  }

  // 3. Legacy check: amount must not exceed any parent budget individually
  const { maxLimit, parentBudgets } = await getParentPeriodBudgets(periodType, date, weekStart);
  if (maxLimit !== null && amount > maxLimit) {
    const violatedParent = parentBudgets.find(p => p.limit === maxLimit);
    if (violatedParent) {
      return `Hạn mức ${PERIOD_LABELS[periodType]} không được vượt quá hạn mức ${PERIOD_LABELS[violatedParent.period]} (${maxLimit.toLocaleString('vi-VN')} ₫)`;
    }
  }

  return null;
}

/**
 * Get budget constraints for UI display
 */
export async function getBudgetConstraints(
  periodType: Period,
  periodKey: string,
  weekStart: 'mon' | 'sun' = 'mon'
): Promise<{
  maxAllowed: number | null;
  minRequired: number | null;
  parentBudget: number | null;
  siblingsSum: number;
  childrenSum: number;
}> {
  const { startDate: date } = parsePeriodKeyToDateRange(periodType, periodKey, weekStart);

  // Parent constraint
  const parentPeriodType = getDirectParentPeriodType(periodType);
  let parentBudget: number | null = null;
  let siblingsSum = 0;
  let maxAllowed: number | null = null;

  if (parentPeriodType) {
    const parentPeriodKey = generatePeriodKey(parentPeriodType, date, weekStart);
    const parent = await getPeriodBudget(parentPeriodType, parentPeriodKey);

    if (parent) {
      parentBudget = parent.limitAmount;
      siblingsSum = await getChildBudgetsSumInPeriod(
        parentPeriodType,
        parentPeriodKey,
        periodType,
        weekStart,
        periodKey
      );
      maxAllowed = parentBudget - siblingsSum;
    }
  }

  // Child constraint
  const childPeriodType = getDirectChildPeriodType(periodType);
  let childrenSum = 0;
  let minRequired: number | null = null;

  if (childPeriodType) {
    childrenSum = await getChildBudgetsSumInPeriod(
      periodType,
      periodKey,
      childPeriodType,
      weekStart
    );
    if (childrenSum > 0) {
      minRequired = childrenSum;
    }
  }

  return {
    maxAllowed,
    minRequired,
    parentBudget,
    siblingsSum,
    childrenSum,
  };
}
