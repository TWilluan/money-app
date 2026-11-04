// Exchange rate service for multi-currency support
// Uses exchangerate-api.com free tier (updates daily)

import { getSettings, updateSettings } from '../db/settings';
import type { Currency, ExchangeRates } from '../types';

const API_URL = 'https://api.exchangerate-api.com/v4/latest/';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Hardcoded fallback rates (USD base)
const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  VND: 24500,
  CNY: 7.24,
};

/**
 * Get default exchange rates (hardcoded fallback)
 */
export function getDefaultRates(): ExchangeRates {
  return {
    base: 'USD',
    rates: { ...FALLBACK_RATES },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch latest exchange rates from API
 * Only updates rates that don't have custom values set
 */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const settings = await getSettings();
    const customRates = settings.customExchangeRates ?? {};

    const response = await fetch(`${API_URL}USD`);
    if (!response.ok) {
      console.error('Exchange rate API error:', response.status);
      return null;
    }

    const data = await response.json();

    // Build rates, preserving custom rates
    const rates: Record<Currency, number> = {
      USD: 1,
      VND: customRates.VND ?? data.rates?.VND ?? FALLBACK_RATES.VND,
      CNY: customRates.CNY ?? data.rates?.CNY ?? FALLBACK_RATES.CNY,
    };

    const exchangeRates: ExchangeRates = {
      base: 'USD',
      rates,
      updatedAt: new Date().toISOString(),
    };

    // Cache to settings (only non-custom rates get updated)
    await updateSettings({ exchangeRates });

    return exchangeRates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return null;
  }
}

/**
 * Get exchange rates with caching
 * Returns cached rates if fresh, otherwise fetches new rates
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const settings = await getSettings();

  // Check if cached rates are still fresh
  if (settings.exchangeRates) {
    const lastUpdated = new Date(settings.exchangeRates.updatedAt).getTime();
    const now = Date.now();

    if (now - lastUpdated < CACHE_DURATION_MS) {
      // Merge custom rates into cached rates
      const customRates = settings.customExchangeRates ?? {};
      return {
        ...settings.exchangeRates,
        rates: {
          ...settings.exchangeRates.rates,
          ...customRates,
        },
      };
    }
  }

  // Fetch fresh rates
  const freshRates = await fetchExchangeRates();

  if (freshRates) {
    return freshRates;
  }

  // Return cached rates if fetch failed
  if (settings.exchangeRates) {
    const customRates = settings.customExchangeRates ?? {};
    return {
      ...settings.exchangeRates,
      rates: {
        ...settings.exchangeRates.rates,
        ...customRates,
      },
    };
  }

  // Return hardcoded defaults if no cached rates
  return getDefaultRates();
}

/**
 * Get effective rate for a currency
 * Priority: custom rate > cached rate > fallback
 */
export async function getEffectiveRate(currency: Currency): Promise<number> {
  const settings = await getSettings();

  // Custom rate takes precedence
  if (settings.customExchangeRates?.[currency] !== undefined) {
    return settings.customExchangeRates[currency]!;
  }

  // Cached rate
  if (settings.exchangeRates?.rates[currency] !== undefined) {
    return settings.exchangeRates.rates[currency];
  }

  // Fallback
  return FALLBACK_RATES[currency];
}

/**
 * Convert amount between currencies
 * Rounds to 2 decimal places
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return Math.round(amount * 100) / 100;
  }

  const fromRate = await getEffectiveRate(fromCurrency);
  const toRate = await getEffectiveRate(toCurrency);

  // Convert: amount in fromCurrency -> USD -> toCurrency
  const amountInUSD = amount / fromRate;
  const converted = amountInUSD * toRate;

  // Round to 2 decimal places
  return Math.round(converted * 100) / 100;
}

/**
 * Set custom exchange rate for a currency
 * Once set, this rate will NOT be auto-updated by API
 */
export async function setCustomRate(
  currency: Currency,
  rate: number
): Promise<void> {
  const settings = await getSettings();
  const customRates = settings.customExchangeRates ?? {};

  await updateSettings({
    customExchangeRates: {
      ...customRates,
      [currency]: rate,
    },
  });
}

/**
 * Clear custom exchange rate for a currency
 * This will allow auto-updates from API again
 */
export async function clearCustomRate(currency: Currency): Promise<void> {
  const settings = await getSettings();
  const customRates = { ...(settings.customExchangeRates ?? {}) };

  delete customRates[currency];

  await updateSettings({
    customExchangeRates: Object.keys(customRates).length > 0 ? customRates : null,
  });
}

/**
 * Check if a currency has a custom rate set
 */
export async function hasCustomRate(currency: Currency): Promise<boolean> {
  const settings = await getSettings();
  return settings.customExchangeRates?.[currency] !== undefined;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'VND': return '₫';
    case 'USD': return '$';
    case 'CNY': return '¥';
    default: return currency;
  }
}

/**
 * Format amount with currency symbol
 */
export function formatWithSymbol(amount: number, currency: Currency): string {
  const symbol = getCurrencySymbol(currency);

  if (currency === 'VND') {
    return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ${symbol}`;
  }

  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}
