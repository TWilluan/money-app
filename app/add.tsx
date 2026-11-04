// Add Transaction screen

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, CategoryChip, DatePickerModal, showAlert } from '@/components';
import { formatNumber, getToday, formatDate, toDateString, getPeriodRange, getRangeStrings } from '@/utils';
import { generatePeriodKey } from '@/db';
import { useI18n } from '@/i18n/context';
import { getCurrencySymbol } from '@/services/exchangeRates';
import type { TransactionType, Period, Currency } from '@/types';

// Currency info for selector
const CURRENCIES: { code: Currency; symbol: string; flag: string }[] = [
  { code: 'VND', symbol: '₫', flag: '🇻🇳' },
  { code: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳' },
];

export default function AddTransactionScreen() {
  const { categories, createTransaction, settings } = useAppStore();
  const { t, locale } = useI18n();

  // Memoized locale-aware period labels
  const PERIOD_LABELS: Record<Period, string> = useMemo(() => ({
    daily: t.period.daily,
    weekly: t.period.weekly,
    monthly: t.period.monthly,
    annually: t.period.annually,
  }), [t]);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  // Default currency = user's settings currency
  const [inputCurrency, setInputCurrency] = useState<Currency>(settings.currency);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getToday());
  const [periodType, setPeriodType] = useState<Period>('daily');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Get current currency info
  const currentCurrencyInfo = CURRENCIES.find(c => c.code === inputCurrency) ?? CURRENCIES[0];

  // Compute period key and display label based on periodType and date
  const periodInfo = useMemo(() => {
    const dateObj = new Date(date);
    const periodKey = generatePeriodKey(periodType, dateObj, settings.weekStart);
    const range = getPeriodRange(periodType, dateObj, settings.weekStart);
    const { startDate, endDate } = getRangeStrings(range);

    let displayLabel = '';
    switch (periodType) {
      case 'daily':
        displayLabel = formatDate(date, locale);
        break;
      case 'weekly':
        displayLabel = `${t.period.weekShort} ${periodKey.split('-W')[1]} (${formatDate(startDate, locale)} - ${formatDate(endDate, locale)})`;
        break;
      case 'monthly':
        displayLabel = `${t.period.monthShort} ${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
        break;
      case 'annually':
        displayLabel = `${t.period.yearShort} ${dateObj.getFullYear()}`;
        break;
    }

    return { periodKey, startDate, displayLabel };
  }, [periodType, date, settings.weekStart, locale, t]);

  // Filter categories by transaction type
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.type === type);
  }, [categories, type]);

  // Reset category when type changes
  useEffect(() => {
    const firstCat = filteredCategories[0];
    setCategoryId(firstCat?.id ?? null);
  }, [type, filteredCategories]);

  const handleAmountChange = useCallback((text: string) => {
    if (inputCurrency === 'VND') {
      // VND: only digits
      const digits = text.replace(/\D/g, '');
      setAmount(digits);
    } else {
      // USD/CNY: allow decimal
      const cleaned = text.replace(/[^\d.]/g, '');
      // Only allow one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        setAmount(parts[0] + '.' + parts.slice(1).join(''));
      } else {
        setAmount(cleaned);
      }
    }
  }, [inputCurrency]);

  const handleTypeChange = useCallback((newType: TransactionType) => {
    setType(newType);
    // Category will be reset by useEffect
  }, []);

  const handleDateSelect = useCallback((selectedDate: Date) => {
    // Use toDateString() to avoid timezone bugs (never use toISOString for dates)
    setDate(toDateString(selectedDate));
  }, []);

  const handleCurrencySelect = useCallback((currency: Currency) => {
    setInputCurrency(currency);
    setShowCurrencyPicker(false);
    // Reset amount when changing currency to avoid confusion
    setAmount('');
  }, []);

  const handleSave = useCallback(async () => {
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      showAlert(t.common.error, t.transaction.enterValidAmount);
      return;
    }

    if (!categoryId) {
      showAlert(t.common.error, t.transaction.selectCategory);
      return;
    }

    // Store amount with its original currency
    await createTransaction({
      amount: parsedAmount,
      currency: inputCurrency,
      type,
      categoryId,
      note,
      date: periodInfo.startDate,
      periodType,
      periodKey: periodInfo.periodKey,
      weekStart: settings.weekStart,
    });

    router.back();
  }, [amount, inputCurrency, categoryId, type, note, periodInfo, periodType, settings.weekStart, createTransaction, t]);

  // Format display amount based on currency
  const formatDisplayAmount = (value: string): string => {
    if (!value) return `0 ${currentCurrencyInfo.symbol}`;
    const num = parseFloat(value);
    if (isNaN(num)) return `0 ${currentCurrencyInfo.symbol}`;

    if (inputCurrency === 'VND') {
      return `${formatNumber(num)} ${currentCurrencyInfo.symbol}`;
    }
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currentCurrencyInfo.symbol}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.transaction.newTransaction}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text
              style={[
                styles.typeLabel,
                type === 'expense' && styles.typeLabelActive,
              ]}
            >
              {t.transaction.expense}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => handleTypeChange('income')}
          >
            <Text
              style={[
                styles.typeLabel,
                type === 'income' && styles.typeLabelActive,
              ]}
            >
              {t.transaction.income}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount display with currency selector */}
        <View style={styles.amountSection}>
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>{t.transaction.amount}</Text>
            <TouchableOpacity
              style={styles.currencySelector}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <Text style={styles.currencyFlag}>{currentCurrencyInfo.flag}</Text>
              <Text style={styles.currencyCode}>{inputCurrency}</Text>
              <Text style={styles.currencyChevron}>▼</Text>
            </TouchableOpacity>
          </View>
          <Text style={[
            styles.amountDisplay,
            type === 'income' && styles.amountIncome,
          ]}>
            {type === 'income' ? '+' : ''}{formatDisplayAmount(amount)}
          </Text>

          {/* Currency picker dropdown */}
          {showCurrencyPicker && (
            <View style={styles.currencyDropdown}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyOption,
                    inputCurrency === currency.code && styles.currencyOptionActive,
                  ]}
                  onPress={() => handleCurrencySelect(currency.code)}
                >
                  <Text style={styles.currencyOptionFlag}>{currency.flag}</Text>
                  <Text style={styles.currencyOptionCode}>{currency.code}</Text>
                  <Text style={styles.currencyOptionSymbol}>{currency.symbol}</Text>
                  {inputCurrency === currency.code && (
                    <Text style={styles.currencyCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Amount input */}
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType={inputCurrency === 'VND' ? 'numeric' : 'decimal-pad'}
          placeholder={t.transaction.enterAmountPlaceholder}
          placeholderTextColor={colors.sub}
        />

        {/* Category picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {type === 'expense' ? t.transaction.expenseCategory : t.transaction.incomeCategory}
          </Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                selected={categoryId === cat.id}
                onPress={() => setCategoryId(cat.id)}
              />
            ))}
            <TouchableOpacity
              style={styles.addCategoryBtn}
              onPress={() => router.push(`/categories/create?type=${type}`)}
            >
              <Text style={styles.addCategoryIcon}>➕</Text>
              <Text style={styles.addCategoryLabel}>{t.common.add}</Text>
            </TouchableOpacity>
          </View>
          {filteredCategories.length === 0 && (
            <Text style={styles.noCategoryHint}>
              {type === 'expense' ? t.transaction.noExpenseCategory : t.transaction.noIncomeCategory}
            </Text>
          )}
        </View>

        {/* Period type selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.transaction.periodType}</Text>
          <View style={styles.periodToggle}>
            {(['daily', 'weekly', 'monthly', 'annually'] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, periodType === p && styles.periodBtnActive]}
                onPress={() => setPeriodType(p)}
              >
                <Text style={[styles.periodLabel, periodType === p && styles.periodLabelActive]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date/Period field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {periodType === 'daily' ? t.period.daily : periodType === 'weekly' ? t.period.weekly : periodType === 'monthly' ? t.period.monthly : t.period.annually}
          </Text>
          <TouchableOpacity
            style={styles.fieldBox}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.fieldValue}>{periodInfo.displayLabel}</Text>
            <Text style={styles.fieldChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelect={handleDateSelect}
          selectedDate={new Date(date)}
          periodType={periodType}
          weekStart={settings.weekStart}
        />

        {/* Note field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.transaction.note}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t.transaction.addNotePlaceholder}
            placeholderTextColor={colors.sub}
            multiline
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            type === 'income' && styles.saveBtnIncome,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {type === 'expense' ? t.transaction.saveExpense : t.transaction.saveIncome}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  typeBtnExpense: {
    backgroundColor: colors.red,
  },
  typeBtnIncome: {
    backgroundColor: colors.green,
  },
  typeLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.sub,
  },
  typeLabelActive: {
    color: colors.text,
  },
  amountSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.sub,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  currencyFlag: {
    fontSize: 16,
  },
  currencyCode: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  currencyChevron: {
    fontSize: 10,
    color: colors.sub,
  },
  currencyDropdown: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
    maxWidth: 200,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 10,
  },
  currencyOptionActive: {
    backgroundColor: colors.card2,
  },
  currencyOptionFlag: {
    fontSize: 20,
  },
  currencyOptionCode: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  currencyOptionSymbol: {
    fontSize: fontSize.base,
    color: colors.sub,
  },
  currencyCheckmark: {
    fontSize: fontSize.base,
    color: colors.green,
    fontWeight: '700',
  },
  amountDisplay: {
    fontSize: fontSize['6xl'],
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  amountIncome: {
    color: colors.green,
  },
  amountInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.sub,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  periodBtnActive: {
    backgroundColor: colors.accent,
  },
  periodLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  periodLabelActive: {
    color: colors.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addCategoryIcon: {
    fontSize: 16,
  },
  addCategoryLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
  },
  noCategoryHint: {
    fontSize: fontSize.sm,
    color: colors.sub,
    fontStyle: 'italic',
    marginTop: 4,
  },
  fieldBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fieldValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  fieldChevron: {
    fontSize: fontSize['2xl'],
    color: colors.sub,
  },
  noteInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnIncome: {
    backgroundColor: colors.green,
  },
  saveBtnText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
});
