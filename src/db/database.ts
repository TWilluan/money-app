// SQLite database initialization and schema

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { checkAndSeedCategories } from './seeds';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('money_manager.db');
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await createTables(database);

  // Create indexes
  await createIndexes(database);

  // Insert default settings if not exists
  await database.execAsync(`
    INSERT OR IGNORE INTO settings (id, currency, week_start, locale, default_budgets)
    VALUES (1, 'VND', 'mon', 'vi-VN', '{"daily":null,"weekly":null,"monthly":2000000,"annually":null}');
  `);

  // Run migrations
  await runMigrations(database);

  // Check and seed categories
  await checkAndSeedCategories(database);
}

async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create categories table with type column
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📁',
      color TEXT NOT NULL DEFAULT '#7489FF',
      type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
      monthly_budget INTEGER,
      sort_order INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0
    );
  `);

  // Create transactions table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      category_id INTEGER NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'annually')),
      period_key TEXT NOT NULL DEFAULT '',
      original_amount REAL,
      original_currency TEXT DEFAULT 'VND',
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // Create period_budgets table for time-specific budgets
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS period_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'annually')),
      period_key TEXT NOT NULL,
      limit_amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'VND',
      created_at TEXT NOT NULL,
      UNIQUE(period_type, period_key)
    );
  `);

  // Create settings table (single row) with default_budgets JSON
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      currency TEXT DEFAULT 'VND',
      week_start TEXT DEFAULT 'mon',
      locale TEXT DEFAULT 'vi-VN',
      last_export_at TEXT,
      default_budgets TEXT DEFAULT '{"daily":null,"weekly":null,"monthly":null,"annually":null}'
    );
  `);
}

async function createIndexes(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  `);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_period_budgets_period ON period_budgets(period_type, period_key);
  `);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
  `);
}
