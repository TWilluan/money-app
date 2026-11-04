// Database seed data
// Extracted from database.ts for Single Responsibility

import type { SQLiteDatabase } from 'expo-sqlite';

interface ExpenseCategory {
  name: string;
  icon: string;
  color: string;
  budget: number | null;
}

interface IncomeCategory {
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: 'Ăn uống', icon: '🍜', color: '#FAA64D', budget: null },
  { name: 'Di chuyển', icon: '🚕', color: '#59C7E5', budget: null },
  { name: 'Khác', icon: '📦', color: '#808080', budget: null },
];

const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  { name: 'Lương', icon: '💼', color: '#4DCC8C' },
  { name: 'Thưởng', icon: '🎯', color: '#FFD700' },
  { name: 'Khác', icon: '💰', color: '#808080' },
];

/**
 * Seed default expense categories using batch insert
 */
export async function seedDefaultCategories(database: SQLiteDatabase): Promise<void> {
  const categories = DEFAULT_EXPENSE_CATEGORIES;

  // Build batch insert query
  const placeholders = categories.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const values: (string | number | null)[] = [];

  categories.forEach((cat, index) => {
    values.push(cat.name, cat.icon, cat.color, 'expense', cat.budget, index);
  });

  await database.runAsync(
    `INSERT INTO categories (name, icon, color, type, monthly_budget, sort_order) VALUES ${placeholders}`,
    values
  );
}

/**
 * Seed default income categories using batch insert
 */
export async function seedIncomeCategories(database: SQLiteDatabase): Promise<void> {
  // Get max sort_order
  const maxOrder = await database.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM categories'
  );
  const startOrder = (maxOrder?.max_order ?? -1) + 1;

  const categories = DEFAULT_INCOME_CATEGORIES;

  // Build batch insert query
  const placeholders = categories.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const values: (string | number | null)[] = [];

  categories.forEach((cat, index) => {
    values.push(cat.name, cat.icon, cat.color, 'income', null, startOrder + index);
  });

  await database.runAsync(
    `INSERT INTO categories (name, icon, color, type, monthly_budget, sort_order) VALUES ${placeholders}`,
    values
  );
}

/**
 * Check if categories need to be seeded
 */
export async function checkAndSeedCategories(database: SQLiteDatabase): Promise<void> {
  // Check if any categories exist
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );

  if (result?.count === 0) {
    await seedDefaultCategories(database);
  }

  // Check if income categories exist
  try {
    const incomeResult = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM categories WHERE type = 'income'"
    );
    if (incomeResult?.count === 0) {
      await seedIncomeCategories(database);
    }
  } catch {
    // type column doesn't exist yet, will be added by migration
  }
}
