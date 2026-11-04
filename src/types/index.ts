// Core types for Money Manager

export type TransactionType = 'expense' | 'income';

export type CategoryType = 'expense' | 'income';

export type Period = 'daily' | 'weekly' | 'monthly' | 'annually';

export interface Category {
  id: number;
  name: string;
  icon: string; // emoji
  color: string; // hex
  type: CategoryType; // NEW: expense or income
  monthlyBudget: number | null; // Legacy - use defaultBudgets instead
  defaultBudgets: DefaultBudgets; // Default budgets per period type
  sortOrder: number;
  archived: boolean;
}

export interface Transaction {
  id: number;
  amount: number;           // Original amount as entered
  currency: Currency;       // Currency when entered
  type: TransactionType;
  categoryId: number;
  note: string;
  date: string; // ISO YYYY-MM-DD (for daily) or period start date
  periodType: Period; // daily/weekly/monthly/annually
  periodKey: string; // "2024-01-15", "2024-W03", "2024-01", "2024"
  createdAt: string; // ISO datetime
}

export interface Budget {
  id: number;
  periodType: Period;
  periodKey: string; // "2024-01-15", "2024-W03", "2024-01", "2024"
  amount: number;
  note: string | null; // Optional: "Tết", "Birthday"
  createdAt: string;
}

// Default budgets (fallback when no specific budget)
export interface DefaultBudgets {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  annually: number | null;
}

export type Currency = 'VND' | 'USD' | 'CNY';

export type Language = 'vi' | 'en' | 'zh';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
}

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  updatedAt: string;
}

export interface Settings {
  currency: Currency;
  language: Language;
  weekStart: 'mon' | 'sun';
  locale: string;
  lastExportAt: string | null;
  defaultBudgets: DefaultBudgets;
  exchangeRates: ExchangeRates | null;
  customExchangeRates: Partial<Record<Currency, number>> | null;
}

// Budget resolution result
export interface BudgetInfo {
  amount: number;
  isDefault: boolean;
  note: string | null;
}

// Aggregation types
export interface CategoryTotal {
  categoryId: number;
  category: Category;
  total: number;
  budget: number | null;
  percentage: number; // 0-1
}

export interface PeriodSummary {
  period: Period;
  periodKey: string;
  startDate: string;
  endDate: string;
  totalExpense: number;
  totalIncome: number;
  budgetLimit: number | null; // Budget for this specific period (null = not set)
  budgetNote: string | null; // Note for specific budget
  categoryTotals: CategoryTotal[];
  incomeTotals: CategoryTotal[]; // Income breakdown by category
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// Legacy type alias for compatibility
export interface PeriodBudget {
  id: number;
  periodType: Period;
  periodKey: string;
  limitAmount: number;
  currency: Currency;
  createdAt: string;
}
