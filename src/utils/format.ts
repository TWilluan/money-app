// Currency formatting and date utilities

import type { Currency } from '../types';

const VND_LOCALE = 'vi-VN';

// Currency format configurations
const CURRENCY_CONFIG: Record<Currency, { decimals: number; locale: string; rate: number }> = {
  VND: { decimals: 0, locale: 'vi-VN', rate: 24500 },
  USD: { decimals: 2, locale: 'en-US', rate: 1 },
  CNY: { decimals: 2, locale: 'zh-CN', rate: 7.24 },
};

/**
 * Format amount as VND currency (no decimals, thousands separators)
 * e.g. 1250000 → "1.250.000 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat(VND_LOCALE, {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format an amount that is ALREADY in the display currency
 * Use this when you've already converted the amount via convertCurrency()
 * @param amount - Amount already in displayCurrency (NOT in USD)
 * @param displayCurrency - Currency to format as
 */
export function formatCurrency(
  amount: number,
  displayCurrency: Currency
): string {
  const config = CURRENCY_CONFIG[displayCurrency] ?? { decimals: 2, locale: 'en-US', rate: 1 };

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Format USD amount and convert to display currency (LEGACY - use formatCurrency with pre-converted amount)
 * Converts from USD (base storage currency) to display currency
 * @param amountInUSD - Amount stored in USD
 * @param displayCurrency - Currency to display in
 * @param exchangeRates - Optional custom exchange rates
 * @deprecated Use convertCurrency() then formatCurrency() instead for proper async rate handling
 */
export function formatCurrencyFromUSD(
  amountInUSD: number,
  displayCurrency: Currency,
  exchangeRates?: Partial<Record<Currency, number>>
): string {
  const config = CURRENCY_CONFIG[displayCurrency] ?? { decimals: 2, locale: 'en-US', rate: 1 };

  // Get rate (custom or default)
  const rate = exchangeRates?.[displayCurrency] ?? config.rate;

  // Convert from USD to display currency
  const displayAmount = amountInUSD * rate;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(displayAmount);
}

/**
 * Format amount as VND without currency symbol
 * e.g. 1250000 → "1.250.000"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat(VND_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with currency-appropriate decimals
 */
export function formatNumberForCurrency(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency] ?? { decimals: 2, locale: 'en-US' };

  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Parse VND formatted string back to number
 * e.g. "1.250.000" → 1250000
 */
export function parseVND(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, ''), 10) || 0;
}

/**
 * Parse formatted number string back to number (alias for parseVND)
 * e.g. "1.250.000" → 1250000
 */
export function parseNumber(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, ''), 10) || 0;
}

// ============================================
// DATE UTILITIES - ALL USE LOCAL TIMEZONE
// ============================================
// IMPORTANT: Never use toISOString() for date strings!
// toISOString() returns UTC which causes timezone bugs.
// Always use these helper functions instead.

/**
 * Format a Date object to YYYY-MM-DD string (LOCAL timezone)
 * This is the canonical way to convert Date → date string
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 */
export function getToday(): string {
  return toDateString(new Date());
}

/**
 * Get current datetime as ISO string (for created_at timestamps)
 * Note: This is intentionally UTC for timestamp consistency
 */
export function getNow(): string {
  return new Date().toISOString();
}

/**
 * Format date for display (locale-aware)
 * e.g. "2026-10-25" → "25 Tháng 10, 2026" (vi) or "Oct 25, 2026" (en)
 */
export function formatDate(dateStr: string, locale: string = 'vi'): string {
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local time
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  if (locale === 'vi') {
    return `${day} Tháng ${month + 1}, ${year}`;
  } else if (locale === 'zh') {
    return `${year}年${month + 1}月${day}日`;
  } else {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${day}, ${year}`;
  }
}

/**
 * Format date short (locale-aware)
 * e.g. "2026-10-25" → "25/10" (vi/zh) or "10/25" (en)
 */
export function formatDateShort(dateStr: string, locale: string = 'vi'): string {
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local time
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if (locale === 'en') {
    return `${month}/${day}`;
  }
  return `${day}/${month}`;
}
