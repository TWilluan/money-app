// Category period budgets database operations

import { getDatabase } from './database';
import type { Period } from '../types';

export interface CategoryPeriodBudget {
  id: number;
  categoryId: number;
  periodType: Period;
  periodKey: string;
  limitAmount: number;
  createdAt: string;
}

interface CategoryPeriodBudgetRow {
  id: number;
  category_id: number;
  period_type: string;
  period_key: string;
  limit_amount: number;
  created_at: string;
}

function mapRowToBudget(row: CategoryPeriodBudgetRow): CategoryPeriodBudget {
  return {
    id: row.id,
    categoryId: row.category_id,
    periodType: row.period_type as Period,
    periodKey: row.period_key,
    limitAmount: row.limit_amount,
    createdAt: row.created_at,
  };
}

/**
 * Get budget for a specific category and period
 */
export async function getCategoryPeriodBudget(
  categoryId: number,
  periodType: Period,
  periodKey: string
): Promise<CategoryPeriodBudget | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryPeriodBudgetRow>(
    `SELECT * FROM category_period_budgets
     WHERE category_id = ? AND period_type = ? AND period_key = ?`,
    [categoryId, periodType, periodKey]
  );
  return row ? mapRowToBudget(row) : null;
}

/**
 * Get all budgets for a category
 */
export async function getCategoryBudgets(
  categoryId: number
): Promise<CategoryPeriodBudget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryPeriodBudgetRow>(
    `SELECT * FROM category_period_budgets
     WHERE category_id = ?
     ORDER BY period_type, period_key DESC`,
    [categoryId]
  );
  return rows.map(mapRowToBudget);
}

/**
 * Get all category budgets for a specific period (for summary)
 */
export async function getAllCategoryBudgetsForPeriod(
  periodType: Period,
  periodKey: string
): Promise<CategoryPeriodBudget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryPeriodBudgetRow>(
    `SELECT * FROM category_period_budgets
     WHERE period_type = ? AND period_key = ?`,
    [periodType, periodKey]
  );
  return rows.map(mapRowToBudget);
}

/**
 * Set or update budget for a category and period
 */
export async function setCategoryPeriodBudget(
  categoryId: number,
  periodType: Period,
  periodKey: string,
  limitAmount: number
): Promise<CategoryPeriodBudget> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Upsert: insert or replace
  await db.runAsync(
    `INSERT INTO category_period_budgets (category_id, period_type, period_key, limit_amount, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(category_id, period_type, period_key)
     DO UPDATE SET limit_amount = excluded.limit_amount`,
    [categoryId, periodType, periodKey, limitAmount, now]
  );

  const budget = await getCategoryPeriodBudget(categoryId, periodType, periodKey);
  return budget!;
}

/**
 * Delete budget for a category and period
 */
export async function deleteCategoryPeriodBudget(
  categoryId: number,
  periodType: Period,
  periodKey: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM category_period_budgets
     WHERE category_id = ? AND period_type = ? AND period_key = ?`,
    [categoryId, periodType, periodKey]
  );
}

/**
 * Delete all budgets for a category
 */
export async function deleteAllCategoryBudgets(categoryId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM category_period_budgets WHERE category_id = ?`,
    [categoryId]
  );
}

/**
 * Get category default budgets from categories table
 */
export async function getCategoryDefaultBudgets(
  categoryId: number
): Promise<Record<Period, number | null>> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ default_budgets: string }>(
    `SELECT default_budgets FROM categories WHERE id = ?`,
    [categoryId]
  );

  if (!row?.default_budgets) {
    return { daily: null, weekly: null, monthly: null, annually: null };
  }

  try {
    return JSON.parse(row.default_budgets);
  } catch {
    return { daily: null, weekly: null, monthly: null, annually: null };
  }
}

/**
 * Set category default budget for a period type
 */
export async function setCategoryDefaultBudget(
  categoryId: number,
  periodType: Period,
  limitAmount: number | null
): Promise<void> {
  const db = await getDatabase();
  const defaults = await getCategoryDefaultBudgets(categoryId);
  defaults[periodType] = limitAmount;

  await db.runAsync(
    `UPDATE categories SET default_budgets = ? WHERE id = ?`,
    [JSON.stringify(defaults), categoryId]
  );
}

/**
 * Get effective budget for a category and period
 * Returns specific period budget if exists, otherwise default budget
 */
export async function getEffectiveCategoryBudget(
  categoryId: number,
  periodType: Period,
  periodKey: string
): Promise<number | null> {
  // First check for specific period budget
  const specificBudget = await getCategoryPeriodBudget(categoryId, periodType, periodKey);
  if (specificBudget) {
    return specificBudget.limitAmount;
  }

  // Fall back to default budget
  const defaults = await getCategoryDefaultBudgets(categoryId);
  return defaults[periodType] ?? null;
}
