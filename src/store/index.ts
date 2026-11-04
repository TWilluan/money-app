// Global app state using Zustand

import { create } from 'zustand';
import type { Category, Transaction, Settings, Period, PeriodSummary, CategoryTotal, PeriodBudget, TransactionType, Currency, Language } from '../types';
import {
  initDatabase,
  getAllCategories,
  getCategoriesByType,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  getAllTransactions,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getTransactionsByDateRangeRaw,
  getSettings as dbGetSettings,
  updateSettings as dbUpdateSettings,
  getDefaultBudget,
  setDefaultBudget as dbSetDefaultBudget,
  getPeriodBudget,
  setPeriodBudget as dbSetPeriodBudget,
  deletePeriodBudget as dbDeletePeriodBudget,
  generatePeriodKey,
  getPeriodBudgetHistory,
  validateBudgetAmount,
  getBudgetConstraints as dbGetBudgetConstraints,
} from '../db';
import { getPeriodRange, getRangeStrings } from '../utils';
import {
  convertCurrency,
  getExchangeRates,
  fetchExchangeRates,
  setCustomRate as doSetCustomRate,
  clearCustomRate as doClearCustomRate,
} from '../services/exchangeRates';

interface AppState {
  // Data
  categories: Category[];
  transactions: Transaction[];
  settings: Settings;

  // UI state
  isLoading: boolean;
  selectedPeriod: Period;
  viewingDate: Date;  // Persisted viewing date
  currentSummary: PeriodSummary | null;
  currentPeriodBudget: PeriodBudget | null;

  // Actions
  initialize: () => Promise<void>;
  setViewingDate: (date: Date) => void;

  // Categories
  loadCategories: () => Promise<void>;
  getCategoriesByType: (type: TransactionType) => Promise<Category[]>;
  createCategory: (data: { name: string; icon: string; color: string; type?: TransactionType; monthlyBudget?: number | null }) => Promise<number>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  // Transactions
  loadTransactions: (limit?: number) => Promise<void>;
  createTransaction: (data: {
    amount: number;
    currency: Currency;
    type: TransactionType;
    categoryId: number;
    note?: string;
    date?: string;
    periodType?: Period;
    periodKey?: string;
    weekStart?: 'mon' | 'sun';
  }) => Promise<number>;
  updateTransaction: (id: number, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  // Period & Summary
  setSelectedPeriod: (period: Period) => void;
  loadSummary: () => Promise<void>;

  // Period Budgets
  loadCurrentPeriodBudget: () => Promise<void>;
  setPeriodBudget: (limitAmount: number, periodKey?: string) => Promise<string | null>;
  removePeriodBudget: (periodKey?: string) => Promise<void>;
  getPeriodBudgetHistory: (limit?: number) => Promise<PeriodBudget[]>;
  validateBudgetAmount: (amount: number) => Promise<string | null>;
  getBudgetConstraints: () => Promise<{ maxLimit: number | null; minLimit: number | null }>;

  // Default Budgets
  getDefaultBudget: (periodType: Period) => Promise<number | null>;
  setDefaultBudget: (periodType: Period, amount: number | null) => Promise<void>;

  // Settings
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  changeCurrency: (newCurrency: Currency) => Promise<void>;

  // Exchange Rates
  refreshExchangeRates: () => Promise<boolean>;
  convertToDisplayCurrency: (amount: number, fromCurrency: Currency) => Promise<number>;
  setCustomExchangeRate: (currency: Currency, rate: number) => Promise<void>;
  clearCustomExchangeRate: (currency: Currency) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  categories: [],
  transactions: [],
  settings: {
    currency: 'VND' as Currency,
    language: 'vi' as Language,
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
  },
  isLoading: true,
  selectedPeriod: 'monthly',
  viewingDate: new Date(),
  currentSummary: null,
  currentPeriodBudget: null,

  // Initialize app
  initialize: async () => {
    set({ isLoading: true });
    try {
      await initDatabase();
      await Promise.all([
        get().loadCategories(),
        get().loadTransactions(50),
        get().loadSettings(),
      ]);
      // Try to fetch fresh exchange rates (non-blocking)
      fetchExchangeRates().catch(() => {});
      await get().loadSummary();
      await get().loadCurrentPeriodBudget();
    } finally {
      set({ isLoading: false });
    }
  },

  // Categories
  loadCategories: async () => {
    const categories = await getAllCategories();
    set({ categories });
  },

  getCategoriesByType: async (type) => {
    return getCategoriesByType(type);
  },

  createCategory: async (data) => {
    const id = await dbCreateCategory(data);
    await get().loadCategories();
    return id;
  },

  updateCategory: async (id, data) => {
    await dbUpdateCategory(id, data);
    await get().loadCategories();
    await get().loadSummary();
  },

  deleteCategory: async (id) => {
    await dbDeleteCategory(id);
    await get().loadCategories();
    await get().loadSummary();
  },

  // Transactions
  loadTransactions: async (limit) => {
    const transactions = await getAllTransactions(limit);
    set({ transactions });
  },

  createTransaction: async (data) => {
    const id = await dbCreateTransaction(data);
    await get().loadTransactions(50);
    await get().loadSummary();
    return id;
  },

  updateTransaction: async (id, data) => {
    await dbUpdateTransaction(id, data);
    await get().loadTransactions(50);
    await get().loadSummary();
  },

  deleteTransaction: async (id) => {
    await dbDeleteTransaction(id);
    await get().loadTransactions(50);
    await get().loadSummary();
  },

  // Period & Summary
  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period, viewingDate: new Date() });
    get().loadSummary();
    get().loadCurrentPeriodBudget();
  },

  setViewingDate: (date) => {
    set({ viewingDate: date });
  },

  loadSummary: async () => {
    const { selectedPeriod, viewingDate, settings, categories } = get();
    const range = getPeriodRange(selectedPeriod, viewingDate, settings.weekStart);
    const { startDate, endDate } = getRangeStrings(range);
    const periodKey = generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);
    const displayCurrency = settings.currency;

    // Get raw transactions for the period
    const [expenseTransactions, incomeTransactions, periodBudget] = await Promise.all([
      getTransactionsByDateRangeRaw(startDate, endDate, 'expense', selectedPeriod),
      getTransactionsByDateRangeRaw(startDate, endDate, 'income', selectedPeriod),
      getPeriodBudget(selectedPeriod, periodKey),
    ]);

    // Convert and sum expenses
    let totalExpense = 0;
    const categoryExpenseMap = new Map<number, number>();

    for (const tx of expenseTransactions) {
      const converted = await convertCurrency(tx.amount, tx.currency, displayCurrency);
      totalExpense += converted;

      const current = categoryExpenseMap.get(tx.categoryId) ?? 0;
      categoryExpenseMap.set(tx.categoryId, current + converted);
    }

    // Convert and sum income
    let totalIncome = 0;
    const categoryIncomeMap = new Map<number, number>();

    for (const tx of incomeTransactions) {
      const converted = await convertCurrency(tx.amount, tx.currency, displayCurrency);
      totalIncome += converted;

      const current = categoryIncomeMap.get(tx.categoryId) ?? 0;
      categoryIncomeMap.set(tx.categoryId, current + converted);
    }

    // Round totals to 2 decimal places
    totalExpense = Math.round(totalExpense * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;

    // Convert budget to display currency (if set)
    let budgetLimit: number | null = null;
    if (periodBudget?.limitAmount) {
      console.log('[loadSummary] Converting budget:', {
        amount: periodBudget.limitAmount,
        fromCurrency: periodBudget.currency,
        toCurrency: displayCurrency,
      });
      budgetLimit = await convertCurrency(periodBudget.limitAmount, periodBudget.currency, displayCurrency);
      console.log('[loadSummary] Converted budget:', budgetLimit);
    }

    // Map expense category totals with full category info
    const categoryTotals: CategoryTotal[] = Array.from(categoryExpenseMap.entries())
      .map(([categoryId, total]) => {
        const category = categories.find(c => c.id === categoryId);
        const budget = category?.monthlyBudget ?? null;
        const roundedTotal = Math.round(total * 100) / 100;
        return {
          categoryId,
          category: category!,
          total: roundedTotal,
          budget,
          percentage: budget ? Math.min(roundedTotal / budget, 1) : (totalExpense > 0 ? roundedTotal / totalExpense : 0),
        };
      })
      .filter(ct => ct.category)
      .sort((a, b) => b.total - a.total);

    // Map income category totals
    const incomeTotals: CategoryTotal[] = Array.from(categoryIncomeMap.entries())
      .map(([categoryId, total]) => {
        const category = categories.find(c => c.id === categoryId);
        const roundedTotal = Math.round(total * 100) / 100;
        return {
          categoryId,
          category: category!,
          total: roundedTotal,
          budget: null,
          percentage: totalIncome > 0 ? roundedTotal / totalIncome : 0,
        };
      })
      .filter(ct => ct.category)
      .sort((a, b) => b.total - a.total);

    const summary: PeriodSummary = {
      period: selectedPeriod,
      periodKey,
      startDate,
      endDate,
      totalExpense,
      totalIncome,
      budgetLimit,
      budgetNote: null,
      categoryTotals,
      incomeTotals,
    };

    set({ currentSummary: summary, currentPeriodBudget: periodBudget });
  },

  // Period Budgets
  loadCurrentPeriodBudget: async () => {
    const { selectedPeriod, viewingDate, settings } = get();
    const periodKey = generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);
    const budget = await getPeriodBudget(selectedPeriod, periodKey);
    set({ currentPeriodBudget: budget });
  },

  setPeriodBudget: async (limitAmount, periodKey) => {
    const { selectedPeriod, viewingDate, settings } = get();
    const key = periodKey ?? generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);

    // Validate against hierarchy constraints (sum validation)
    const error = await validateBudgetAmount(selectedPeriod, key, limitAmount, settings.weekStart);
    if (error) {
      return error;
    }

    await dbSetPeriodBudget(selectedPeriod, key, limitAmount);
    await get().loadSummary();
    return null;
  },

  removePeriodBudget: async (periodKey) => {
    const { selectedPeriod, viewingDate, settings } = get();
    const key = periodKey ?? generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);
    await dbDeletePeriodBudget(selectedPeriod, key);
    await get().loadSummary();
  },

  getPeriodBudgetHistory: async (limit = 12) => {
    const { selectedPeriod } = get();
    return getPeriodBudgetHistory(selectedPeriod, limit);
  },

  validateBudgetAmount: async (amount) => {
    const { selectedPeriod, viewingDate, settings } = get();
    const periodKey = generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);
    return validateBudgetAmount(selectedPeriod, periodKey, amount, settings.weekStart);
  },

  getBudgetConstraints: async () => {
    const { selectedPeriod, viewingDate, settings } = get();
    const periodKey = generatePeriodKey(selectedPeriod, viewingDate, settings.weekStart);
    const constraintData = await dbGetBudgetConstraints(selectedPeriod, periodKey, settings.weekStart);
    return {
      maxLimit: constraintData.maxAllowed,
      minLimit: constraintData.minRequired,
    };
  },

  // Default Budgets
  getDefaultBudget: async (periodType) => {
    return getDefaultBudget(periodType);
  },

  setDefaultBudget: async (periodType, amount) => {
    await dbSetDefaultBudget(periodType, amount);
    await get().loadSettings();
    await get().loadSummary();
  },

  // Settings
  loadSettings: async () => {
    const settings = await dbGetSettings();
    set({ settings });
  },

  updateSettings: async (data) => {
    await dbUpdateSettings(data);
    await get().loadSettings();
  },

  changeCurrency: async (newCurrency) => {
    const { settings } = get();
    const oldCurrency = settings.currency;

    if (oldCurrency === newCurrency) return;

    // Just update the display currency setting
    await dbUpdateSettings({ currency: newCurrency });

    // Reload everything - summaries will auto-convert to new display currency
    await get().loadSettings();
    await get().loadTransactions(50);
    await get().loadSummary();
  },

  // Exchange Rates
  refreshExchangeRates: async () => {
    const rates = await fetchExchangeRates();
    if (rates) {
      await get().loadSettings();
      await get().loadSummary(); // Recalculate with new rates
      return true;
    }
    return false;
  },

  convertToDisplayCurrency: async (amount, fromCurrency) => {
    const { settings } = get();
    return convertCurrency(amount, fromCurrency, settings.currency);
  },

  setCustomExchangeRate: async (currency, rate) => {
    await doSetCustomRate(currency, rate);
    await get().loadSettings();
    await get().loadSummary(); // Recalculate with new rate
  },

  clearCustomExchangeRate: async (currency) => {
    await doClearCustomRate(currency);
    await get().loadSettings();
    await get().loadSummary(); // Recalculate with default rate
  },
}));
