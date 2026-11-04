// Transaction CRUD operations

import { getDatabase } from './database';
import type { Transaction, TransactionType, Period, Currency } from '../types';
import { getToday, getNow, getIncludedPeriodTypes } from '../utils';
import { generatePeriodKey } from './periodBudgets';

interface TransactionRow {
  id: number;
  amount: number;
  currency: string;
  type: string;
  category_id: number;
  note: string;
  date: string;
  period_type: string;
  period_key: string;
  created_at: string;
}

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    currency: (row.currency || 'VND') as Currency,
    type: row.type as TransactionType,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
    periodType: (row.period_type || 'daily') as Period,
    periodKey: row.period_key || row.date,
    createdAt: row.created_at,
  };
}

export async function getAllTransactions(limit?: number): Promise<Transaction[]> {
  const db = await getDatabase();

  if (limit) {
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(mapRow);
  }

  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRow);
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return row ? mapRow(row) : null;
}

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string,
  type?: TransactionType
): Promise<Transaction[]> {
  const db = await getDatabase();

  let query = 'SELECT * FROM transactions WHERE date >= ? AND date <= ?';
  const params: (string | number)[] = [startDate, endDate];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  const rows = await db.getAllAsync<TransactionRow>(query, params);
  return rows.map(mapRow);
}

export async function getTransactionsByCategory(
  categoryId: number,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  const db = await getDatabase();

  let query = 'SELECT * FROM transactions WHERE category_id = ?';
  const params: (string | number)[] = [categoryId];

  if (startDate && endDate) {
    query += ' AND date >= ? AND date <= ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  const rows = await db.getAllAsync<TransactionRow>(query, params);
  return rows.map(mapRow);
}

export async function createTransaction(data: {
  amount: number;
  currency: Currency;
  type: TransactionType;
  categoryId: number;
  note?: string;
  date?: string;
  periodType?: Period;
  periodKey?: string;
  weekStart?: 'mon' | 'sun';
}): Promise<number> {
  const db = await getDatabase();

  const periodType = data.periodType || 'daily';
  const date = data.date || getToday();
  const periodKey = data.periodKey || generatePeriodKey(periodType, new Date(date), data.weekStart || 'mon');

  const result = await db.runAsync(
    `INSERT INTO transactions (amount, currency, type, category_id, note, date, period_type, period_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.amount,
      data.currency,
      data.type,
      data.categoryId,
      data.note || '',
      date,
      periodType,
      periodKey,
      getNow(),
    ]
  );

  return result.lastInsertRowId;
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    amount: number;
    currency: Currency;
    type: TransactionType;
    categoryId: number;
    note: string;
    date: string;
    periodType: Period;
    periodKey: string;
  }>
): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.amount !== undefined) {
    updates.push('amount = ?');
    values.push(data.amount);
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?');
    values.push(data.currency);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.categoryId !== undefined) {
    updates.push('category_id = ?');
    values.push(data.categoryId);
  }
  if (data.note !== undefined) {
    updates.push('note = ?');
    values.push(data.note);
  }
  if (data.date !== undefined) {
    updates.push('date = ?');
    values.push(data.date);
  }
  if (data.periodType !== undefined) {
    updates.push('period_type = ?');
    values.push(data.periodType);
  }
  if (data.periodKey !== undefined) {
    updates.push('period_key = ?');
    values.push(data.periodKey);
  }

  if (updates.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

// Aggregation queries - these now return raw amounts, conversion happens in store

export async function getTransactionsByDateRangeRaw(
  startDate: string,
  endDate: string,
  type: TransactionType,
  viewingPeriod: Period = 'daily'
): Promise<Transaction[]> {
  const db = await getDatabase();
  const includedTypes = getIncludedPeriodTypes(viewingPeriod);
  const placeholders = includedTypes.map(() => '?').join(',');

  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions
     WHERE date >= ? AND date <= ? AND type = ? AND period_type IN (${placeholders})
     ORDER BY date DESC, created_at DESC`,
    [startDate, endDate, type, ...includedTypes]
  );
  return rows.map(mapRow);
}

export async function getTransactionCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions'
  );
  return result?.count ?? 0;
}

export async function getTotalByDateRange(
  startDate: string,
  endDate: string,
  type: TransactionType,
  viewingPeriod: Period = 'daily'
): Promise<number> {
  const db = await getDatabase();
  const includedTypes = getIncludedPeriodTypes(viewingPeriod);
  const placeholders = includedTypes.map(() => '?').join(',');

  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions
     WHERE date >= ? AND date <= ? AND type = ? AND period_type IN (${placeholders})`,
    [startDate, endDate, type, ...includedTypes]
  );
  return result?.total ?? 0;
}

export async function getCategoryTotalsByDateRange(
  startDate: string,
  endDate: string,
  type: TransactionType,
  viewingPeriod: Period = 'daily'
): Promise<{ categoryId: number; total: number }[]> {
  const db = await getDatabase();
  const includedTypes = getIncludedPeriodTypes(viewingPeriod);
  const placeholders = includedTypes.map(() => '?').join(',');

  const rows = await db.getAllAsync<{ category_id: number; total: number }>(
    `SELECT category_id, SUM(amount) as total FROM transactions
     WHERE date >= ? AND date <= ? AND type = ? AND period_type IN (${placeholders})
     GROUP BY category_id
     ORDER BY total DESC`,
    [startDate, endDate, type, ...includedTypes]
  );
  return rows.map((r) => ({ categoryId: r.category_id, total: r.total }));
}

export async function getTotalByDateRangeAndCategory(
  startDate: string,
  endDate: string,
  categoryId: number,
  viewingPeriod: Period = 'daily'
): Promise<number> {
  const db = await getDatabase();
  const includedTypes = getIncludedPeriodTypes(viewingPeriod);
  const placeholders = includedTypes.map(() => '?').join(',');

  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions
     WHERE date >= ? AND date <= ? AND category_id = ? AND period_type IN (${placeholders})`,
    [startDate, endDate, categoryId, ...includedTypes]
  );
  return result?.total ?? 0;
}
