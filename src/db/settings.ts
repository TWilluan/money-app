// Settings operations

import { getDatabase } from './database';
import type { Settings, DefaultBudgets, Currency, ExchangeRates, Language } from '../types';

interface SettingsRow {
  id: number;
  currency: string;
  language: string;
  week_start: string;
  locale: string;
  last_export_at: string | null;
  default_budgets: string;
  exchange_rates: string | null;
  custom_exchange_rates: string | null;
}

function mapRow(row: SettingsRow): Settings {
  let defaultBudgets: DefaultBudgets = {
    daily: null,
    weekly: null,
    monthly: null,
    annually: null,
  };

  try {
    if (row.default_budgets) {
      defaultBudgets = JSON.parse(row.default_budgets);
    }
  } catch {
    // Use defaults on parse error
  }

  let exchangeRates: ExchangeRates | null = null;
  try {
    if (row.exchange_rates) {
      exchangeRates = JSON.parse(row.exchange_rates);
    }
  } catch {
    // Use null on parse error
  }

  let customExchangeRates: Partial<Record<Currency, number>> | null = null;
  try {
    if (row.custom_exchange_rates) {
      customExchangeRates = JSON.parse(row.custom_exchange_rates);
    }
  } catch {
    // Use null on parse error
  }

  return {
    currency: row.currency as Currency,
    language: (row.language as Language) || 'vi',
    weekStart: row.week_start as 'mon' | 'sun',
    locale: row.locale,
    lastExportAt: row.last_export_at,
    defaultBudgets,
    exchangeRates,
    customExchangeRates,
  };
}

export async function getSettings(): Promise<Settings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM settings WHERE id = 1'
  );

  if (!row) {
    // Return defaults if somehow settings don't exist
    return {
      currency: 'VND',
      language: 'vi',
      weekStart: 'mon',
      locale: 'vi-VN',
      lastExportAt: null,
      defaultBudgets: {
        daily: null,
        weekly: null,
        monthly: 2000000,
        annually: null,
      },
      exchangeRates: null,
      customExchangeRates: null,
    };
  }

  return mapRow(row);
}

export async function updateSettings(
  data: Partial<Settings>
): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.currency !== undefined) {
    updates.push('currency = ?');
    values.push(data.currency);
  }
  if (data.language !== undefined) {
    updates.push('language = ?');
    values.push(data.language);
  }
  if (data.weekStart !== undefined) {
    updates.push('week_start = ?');
    values.push(data.weekStart);
  }
  if (data.locale !== undefined) {
    updates.push('locale = ?');
    values.push(data.locale);
  }
  if (data.lastExportAt !== undefined) {
    updates.push('last_export_at = ?');
    values.push(data.lastExportAt);
  }
  if (data.defaultBudgets !== undefined) {
    updates.push('default_budgets = ?');
    values.push(JSON.stringify(data.defaultBudgets));
  }
  if (data.exchangeRates !== undefined) {
    updates.push('exchange_rates = ?');
    values.push(data.exchangeRates ? JSON.stringify(data.exchangeRates) : null);
  }
  if (data.customExchangeRates !== undefined) {
    updates.push('custom_exchange_rates = ?');
    values.push(data.customExchangeRates ? JSON.stringify(data.customExchangeRates) : null);
  }

  if (updates.length === 0) return;

  await db.runAsync(
    `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`,
    values
  );
}

/**
 * Get default budget for a period type
 */
export async function getDefaultBudget(
  periodType: 'daily' | 'weekly' | 'monthly' | 'annually'
): Promise<number | null> {
  const settings = await getSettings();
  return settings.defaultBudgets[periodType];
}

/**
 * Set default budget for a period type
 */
export async function setDefaultBudget(
  periodType: 'daily' | 'weekly' | 'monthly' | 'annually',
  amount: number | null
): Promise<void> {
  const settings = await getSettings();
  const newDefaults = { ...settings.defaultBudgets, [periodType]: amount };
  await updateSettings({ defaultBudgets: newDefaults });
}
