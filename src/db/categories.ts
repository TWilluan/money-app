// Category CRUD operations

import { getDatabase } from './database';
import { deleteAllCategoryBudgets } from './categoryPeriodBudgets';
import type { Category, TransactionType, DefaultBudgets } from '../types';

interface CategoryRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: string;
  monthly_budget: number | null;
  default_budgets: string | null;
  sort_order: number;
  archived: number;
}

function parseDefaultBudgets(json: string | null): DefaultBudgets {
  if (!json) {
    return { daily: null, weekly: null, monthly: null, annually: null };
  }
  try {
    return JSON.parse(json);
  } catch {
    return { daily: null, weekly: null, monthly: null, annually: null };
  }
}

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type as TransactionType,
    monthlyBudget: row.monthly_budget,
    defaultBudgets: parseDefaultBudgets(row.default_budgets),
    sortOrder: row.sort_order,
    archived: row.archived === 1,
  };
}

export async function getAllCategories(includeArchived = false): Promise<Category[]> {
  const db = await getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM categories ORDER BY type DESC, sort_order ASC'
    : 'SELECT * FROM categories WHERE archived = 0 ORDER BY type DESC, sort_order ASC';

  const rows = await db.getAllAsync<CategoryRow>(query);
  return rows.map(mapRow);
}

export async function getCategoriesByType(
  type: TransactionType,
  includeArchived = false
): Promise<Category[]> {
  const db = await getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC'
    : 'SELECT * FROM categories WHERE type = ? AND archived = 0 ORDER BY sort_order ASC';

  const rows = await db.getAllAsync<CategoryRow>(query, [type]);
  return rows.map(mapRow);
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return row ? mapRow(row) : null;
}

export async function createCategory(data: {
  name: string;
  icon: string;
  color: string;
  type?: TransactionType;
  monthlyBudget?: number | null;
}): Promise<number> {
  const db = await getDatabase();

  // Get max sort order for this type
  const categoryType = data.type ?? 'expense';
  const maxOrder = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM categories WHERE type = ?',
    [categoryType]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  // Initialize default_budgets with monthly budget if provided
  const defaultBudgets: DefaultBudgets = {
    daily: null,
    weekly: null,
    monthly: data.monthlyBudget ?? null,
    annually: null,
  };

  const result = await db.runAsync(
    `INSERT INTO categories (name, icon, color, type, monthly_budget, default_budgets, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.icon,
      data.color,
      categoryType,
      data.monthlyBudget ?? null,
      JSON.stringify(defaultBudgets),
      sortOrder,
    ]
  );

  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
    monthlyBudget: number | null;
    defaultBudgets: DefaultBudgets;
    sortOrder: number;
    archived: boolean;
  }>
): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    values.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    values.push(data.color);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.monthlyBudget !== undefined) {
    updates.push('monthly_budget = ?');
    values.push(data.monthlyBudget);
  }
  if (data.defaultBudgets !== undefined) {
    updates.push('default_budgets = ?');
    values.push(JSON.stringify(data.defaultBudgets));
  }
  if (data.sortOrder !== undefined) {
    updates.push('sort_order = ?');
    values.push(data.sortOrder);
  }
  if (data.archived !== undefined) {
    updates.push('archived = ?');
    values.push(data.archived ? 1 : 0);
  }

  if (updates.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  // Delete all period budgets for this category
  await deleteAllCategoryBudgets(id);
  // Archive instead of delete to preserve transaction history
  await db.runAsync('UPDATE categories SET archived = 1 WHERE id = ?', [id]);
}

export async function reorderCategories(ids: number[]): Promise<void> {
  const db = await getDatabase();
  for (let i = 0; i < ids.length; i++) {
    await db.runAsync(
      'UPDATE categories SET sort_order = ? WHERE id = ?',
      [i, ids[i]]
    );
  }
}
