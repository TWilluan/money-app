// Database migration utilities
// Extracted from database.ts for Single Responsibility

import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Run all database migrations
 * Migrations are idempotent - safe to run multiple times
 */
export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  await migrateAddCategoryType(database);
  await migrateAddDefaultBudgets(database);
  await migrateAddTransactionPeriod(database);
  await createPeriodIndex(database);
  await migrateAddCategoryDefaultBudgets(database);
  await createCategoryPeriodBudgetsTable(database);
  await migrateAddExchangeRates(database);
  await migrateAddLanguage(database);
  await migrateAddTransactionCurrency(database);
  await migrateAddBudgetCurrency(database);
}

/**
 * Add 'type' column to categories table
 */
async function migrateAddCategoryType(database: SQLiteDatabase): Promise<void> {
  const categoryColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(categories)"
  );
  const hasTypeColumn = categoryColumns.some(col => col.name === 'type');

  if (!hasTypeColumn) {
    await database.execAsync(
      `ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'expense'`
    );
    await database.execAsync(
      `UPDATE categories SET type = 'expense' WHERE type IS NULL`
    );
  }
}

/**
 * Add 'default_budgets' column to settings table
 */
async function migrateAddDefaultBudgets(database: SQLiteDatabase): Promise<void> {
  const settingsColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(settings)"
  );
  const hasDefaultBudgets = settingsColumns.some(col => col.name === 'default_budgets');

  if (!hasDefaultBudgets) {
    await database.execAsync(
      `ALTER TABLE settings ADD COLUMN default_budgets TEXT DEFAULT '{"daily":null,"weekly":null,"monthly":null,"annually":null}'`
    );
  }
}

/**
 * Add 'period_type' and 'period_key' columns to transactions table
 */
async function migrateAddTransactionPeriod(database: SQLiteDatabase): Promise<void> {
  const transactionColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(transactions)"
  );
  const hasPeriodType = transactionColumns.some(col => col.name === 'period_type');
  const hasPeriodKey = transactionColumns.some(col => col.name === 'period_key');

  if (!hasPeriodType) {
    await database.execAsync(
      `ALTER TABLE transactions ADD COLUMN period_type TEXT DEFAULT 'daily'`
    );
    await database.execAsync(
      `UPDATE transactions SET period_type = 'daily' WHERE period_type IS NULL`
    );
  }

  if (!hasPeriodKey) {
    await database.execAsync(
      `ALTER TABLE transactions ADD COLUMN period_key TEXT DEFAULT ''`
    );
    // Migrate existing transactions: set period_key = date for daily transactions
    await database.execAsync(
      `UPDATE transactions SET period_key = date WHERE period_key = '' OR period_key IS NULL`
    );
  }
}

/**
 * Create index for period queries
 */
async function createPeriodIndex(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(period_type, period_key);
  `);
}

/**
 * Add 'default_budgets' column to categories table for per-period defaults
 */
async function migrateAddCategoryDefaultBudgets(database: SQLiteDatabase): Promise<void> {
  const categoryColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(categories)"
  );
  const hasDefaultBudgets = categoryColumns.some(col => col.name === 'default_budgets');

  if (!hasDefaultBudgets) {
    await database.execAsync(
      `ALTER TABLE categories ADD COLUMN default_budgets TEXT DEFAULT '{"daily":null,"weekly":null,"monthly":null,"annually":null}'`
    );
    // Migrate existing monthly_budget to default_budgets.monthly
    await database.execAsync(`
      UPDATE categories
      SET default_budgets = json_set(
        '{"daily":null,"weekly":null,"monthly":null,"annually":null}',
        '$.monthly',
        monthly_budget
      )
      WHERE monthly_budget IS NOT NULL
    `);
  }
}

/**
 * Create category_period_budgets table for specific period budgets
 */
async function createCategoryPeriodBudgetsTable(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS category_period_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'annually')),
      period_key TEXT NOT NULL,
      limit_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(category_id, period_type, period_key),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_category_period_budgets
    ON category_period_budgets(category_id, period_type, period_key);
  `);
}

/**
 * Add 'exchange_rates' and 'custom_exchange_rates' columns to settings table
 */
async function migrateAddExchangeRates(database: SQLiteDatabase): Promise<void> {
  const settingsColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(settings)"
  );
  const hasExchangeRates = settingsColumns.some(col => col.name === 'exchange_rates');
  const hasCustomExchangeRates = settingsColumns.some(col => col.name === 'custom_exchange_rates');

  if (!hasExchangeRates) {
    await database.execAsync(
      `ALTER TABLE settings ADD COLUMN exchange_rates TEXT DEFAULT NULL`
    );
  }

  if (!hasCustomExchangeRates) {
    await database.execAsync(
      `ALTER TABLE settings ADD COLUMN custom_exchange_rates TEXT DEFAULT NULL`
    );
  }
}

/**
 * Add 'language' column to settings table
 */
async function migrateAddLanguage(database: SQLiteDatabase): Promise<void> {
  const settingsColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(settings)"
  );
  const hasLanguage = settingsColumns.some(col => col.name === 'language');

  if (!hasLanguage) {
    await database.execAsync(
      `ALTER TABLE settings ADD COLUMN language TEXT DEFAULT 'vi'`
    );
  }
}

/**
 * Add 'currency' column to transactions table
 * Default to VND for existing transactions
 */
async function migrateAddTransactionCurrency(database: SQLiteDatabase): Promise<void> {
  const transactionColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(transactions)"
  );
  const hasCurrency = transactionColumns.some(col => col.name === 'currency');

  if (!hasCurrency) {
    // Get current settings currency to use as default for existing transactions
    const settingsRow = await database.getFirstAsync<{ currency: string }>(
      "SELECT currency FROM settings LIMIT 1"
    );
    const defaultCurrency = settingsRow?.currency ?? 'VND';

    await database.execAsync(
      `ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT '${defaultCurrency}'`
    );
    // Set currency for all existing transactions
    await database.execAsync(
      `UPDATE transactions SET currency = '${defaultCurrency}' WHERE currency IS NULL`
    );
  }
}

/**
 * Add 'currency' column to period_budgets table
 * Default to settings currency for existing budgets
 */
async function migrateAddBudgetCurrency(database: SQLiteDatabase): Promise<void> {
  const budgetColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(period_budgets)"
  );
  const hasCurrency = budgetColumns.some(col => col.name === 'currency');

  if (!hasCurrency) {
    // Get current settings currency to use as default for existing budgets
    const settingsRow = await database.getFirstAsync<{ currency: string }>(
      "SELECT currency FROM settings LIMIT 1"
    );
    const defaultCurrency = settingsRow?.currency ?? 'VND';

    await database.execAsync(
      `ALTER TABLE period_budgets ADD COLUMN currency TEXT DEFAULT '${defaultCurrency}'`
    );
    // Set currency for all existing budgets
    await database.execAsync(
      `UPDATE period_budgets SET currency = '${defaultCurrency}' WHERE currency IS NULL`
    );
  }
}
