// Budget management screen - Per-period budget setting

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, showAlert } from '@/components';
import { formatCurrency, formatNumber, parseVND, getPeriodRange, getRangeStrings } from '@/utils';
import {
  generatePeriodKey,
  getPeriodBudget,
  setPeriodBudget as dbSetPeriodBudget,
  deletePeriodBudget as dbDeletePeriodBudget,
  getPeriodBudgetHistory,
  validateBudgetAmount,
  getBudgetConstraints,
  getTotalByDateRange,
} from '@/db';
import { convertCurrency } from '@/services/exchangeRates';
import type { Period, PeriodBudget, Currency } from '@/types';
import { useI18n } from '@/i18n/context';

const CURRENCIES: { code: Currency; flag: string; symbol: string }[] = [
  { code: 'VND', flag: '🇻🇳', symbol: '₫' },
  { code: 'USD', flag: '🇺🇸', symbol: '$' },
  { code: 'CNY', flag: '🇨🇳', symbol: '¥' },
];

export default function BudgetScreen() {
  const { settings, selectedPeriod, loadSummary } = useAppStore();
  const { t, language } = useI18n();
  const params = useLocalSearchParams<{ date?: string; period?: string }>();

  // Use params if provided, otherwise use current date and selected period
  const targetDate = params.date ? new Date(params.date) : new Date();
  const targetPeriod = (params.period as Period) ?? selectedPeriod;
  const periodKey = generatePeriodKey(targetPeriod, targetDate, settings.weekStart);

  const [periodBudget, setPeriodBudgetState] = useState<PeriodBudget | null>(null);
  const [totalExpense, setTotalExpense] = useState(0);
  const [convertedBudgetLimit, setConvertedBudgetLimit] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [inputCurrency, setInputCurrency] = useState<Currency>(settings.currency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [history, setHistory] = useState<PeriodBudget[]>([]);
  const [convertedHistory, setConvertedHistory] = useState<{ budget: PeriodBudget; convertedAmount: number }[]>([]);
  const [constraints, setConstraints] = useState<{ maxLimit: number | null; minLimit: number | null }>({
    maxLimit: null,
    minLimit: null,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Period labels using i18n
  const PERIOD_LABELS: Record<Period, string> = {
    daily: t.budget.daily.toLowerCase(),
    weekly: t.budget.weekly.toLowerCase(),
    monthly: t.budget.monthly.toLowerCase(),
    annually: t.budget.annually.toLowerCase(),
  };

  useEffect(() => {
    loadData();
  }, [targetPeriod, periodKey]);

  const loadData = async () => {
    // Load budget for this specific period
    const budget = await getPeriodBudget(targetPeriod, periodKey);
    setPeriodBudgetState(budget);

    // Convert budget to display currency
    if (budget?.limitAmount) {
      const converted = await convertCurrency(budget.limitAmount, budget.currency, settings.currency);
      console.log('[budget.tsx loadData] Converting budget:', {
        amount: budget.limitAmount,
        from: budget.currency,
        to: settings.currency,
        converted,
      });
      setConvertedBudgetLimit(converted);
    } else {
      setConvertedBudgetLimit(0);
    }

    // Load expense total for this period (already in display currency from store)
    // Note: getTotalByDateRange returns raw sum - we need to use store's converted value
    const range = getPeriodRange(targetPeriod, targetDate, settings.weekStart);
    const { startDate, endDate } = getRangeStrings(range);
    const expense = await getTotalByDateRange(startDate, endDate, 'expense');
    setTotalExpense(expense);

    // Load history and convert each to display currency
    const h = await getPeriodBudgetHistory(targetPeriod, 6);
    setHistory(h);
    const convertedH = await Promise.all(
      h.map(async (b) => ({
        budget: b,
        convertedAmount: await convertCurrency(b.limitAmount, b.currency, settings.currency),
      }))
    );
    setConvertedHistory(convertedH);

    // Load constraints using proper sum-based calculation
    const constraintData = await getBudgetConstraints(targetPeriod, periodKey, settings.weekStart);
    setConstraints({
      maxLimit: constraintData.maxAllowed,
      minLimit: constraintData.minRequired,
    });
  };

  const openEditModal = () => {
    setBudgetInput(periodBudget ? formatNumber(periodBudget.limitAmount) : '');
    setInputCurrency(settings.currency);
    setValidationError(null);
    setShowEditModal(true);
  };

  const handleInputChange = (text: string) => {
    const value = parseVND(text);
    setBudgetInput(formatNumber(value));

    // Real-time validation hint
    if (value > 0) {
      if (constraints.maxLimit !== null && value > constraints.maxLimit) {
        setValidationError(`${t.budget.exceeded}: ${formatCurrency(constraints.maxLimit, inputCurrency)}`);
      } else if (constraints.minLimit !== null && value < constraints.minLimit) {
        setValidationError(`Min: ${formatCurrency(constraints.minLimit, inputCurrency)}`);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  };

  const handleCurrencySelect = useCallback((currency: Currency) => {
    setInputCurrency(currency);
    setShowCurrencyPicker(false);
    setBudgetInput(''); // Reset when changing currency
  }, []);

  const handleSave = async () => {
    const value = parseVND(budgetInput);
    if (value > 0) {
      // Validate against hierarchy constraints
      const error = await validateBudgetAmount(targetPeriod, periodKey, value, settings.weekStart);
      if (error) {
        showAlert(t.common.error, error);
        return;
      }
      await dbSetPeriodBudget(targetPeriod, periodKey, value, inputCurrency);
    } else {
      await dbDeletePeriodBudget(targetPeriod, periodKey);
    }
    setShowEditModal(false);
    loadData();
    // Refresh global summary so Dashboard updates
    loadSummary();
  };

  const handleRemove = async () => {
    await dbDeletePeriodBudget(targetPeriod, periodKey);
    setShowEditModal(false);
    loadData();
    // Refresh global summary so Dashboard updates
    loadSummary();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Format period display (e.g., "Tháng 10/2026", "Tuần 44/2026")
  const getPeriodDisplayLabel = () => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    switch (targetPeriod) {
      case 'daily':
        return `${targetDate.getDate()}/${month}/${year}`;
      case 'weekly':
        if (language === 'en') return `Week ${periodKey.split('-W')[1]}/${year}`;
        if (language === 'zh') return `第${periodKey.split('-W')[1]}周/${year}`;
        return `Tuần ${periodKey.split('-W')[1]}/${year}`;
      case 'monthly':
        if (language === 'en') return `${getMonthName(month, language)} ${year}`;
        if (language === 'zh') return `${year}年${month}月`;
        return `Tháng ${month}/${year}`;
      case 'annually':
        if (language === 'en') return `Year ${year}`;
        if (language === 'zh') return `${year}年`;
        return `Năm ${year}`;
    }
  };

  const getMonthName = (month: number, lang: string): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  // Use converted budget limit for display
  const budgetLimit = convertedBudgetLimit;
  const remaining = Math.max(0, budgetLimit - totalExpense);
  const progress = budgetLimit > 0 ? Math.min(totalExpense / budgetLimit, 1) : 0;
  const isOverBudget = totalExpense > budgetLimit && budgetLimit > 0;

  const currentCurrencyInfo = CURRENCIES.find(c => c.code === inputCurrency) || CURRENCIES[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.budget.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Period Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{getPeriodDisplayLabel()}</Text>
              <Text style={styles.cardSubtitle}>{periodKey}</Text>
            </View>
            <TouchableOpacity onPress={openEditModal}>
              <Text style={styles.editBtn}>
                {periodBudget ? t.budget.edit : t.budget.set}
              </Text>
            </TouchableOpacity>
          </View>

          {budgetLimit > 0 ? (
            <>
              <View style={styles.budgetMain}>
                <Text style={styles.spentLabel}>{t.budget.spent}</Text>
                <Text style={[styles.spentAmount, isOverBudget && styles.overspent]}>
                  {formatCurrency(totalExpense, settings.currency)}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` },
                      isOverBudget && styles.progressOverspent,
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>
                    {isOverBudget ? t.budget.exceeded : t.budget.remaining}: {formatCurrency(isOverBudget ? totalExpense - budgetLimit : remaining, settings.currency)}
                  </Text>
                  <Text style={styles.progressText}>
                    {t.budget.title}: {formatCurrency(budgetLimit, settings.currency)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noBudget}>
              <Text style={styles.noBudgetIcon}>📊</Text>
              <Text style={styles.noBudgetText}>
                {t.budget.notSet}
              </Text>
              <TouchableOpacity style={styles.setBudgetBtn} onPress={openEditModal}>
                <Text style={styles.setBudgetText}>{t.budget.set}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Constraints Info */}
        {(constraints.maxLimit !== null || constraints.minLimit !== null) && (
          <View style={styles.constraintsCard}>
            <Text style={styles.constraintsTitle}>⚠️ {language === 'en' ? 'Constraints' : language === 'zh' ? '约束' : 'Ràng buộc'}</Text>
            {constraints.minLimit !== null && (
              <Text style={styles.constraintsText}>
                • Min: {formatCurrency(constraints.minLimit, settings.currency)}
              </Text>
            )}
            {constraints.maxLimit !== null && (
              <Text style={styles.constraintsText}>
                • Max: {formatCurrency(constraints.maxLimit, settings.currency)}
              </Text>
            )}
          </View>
        )}

        {/* History */}
        {convertedHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>
              {language === 'en' ? 'History' : language === 'zh' ? '历史记录' : 'Lịch sử'} ({PERIOD_LABELS[targetPeriod]})
            </Text>
            <View style={styles.historyCard}>
              {convertedHistory.map(({ budget: item, convertedAmount }, index) => (
                <View key={item.id}>
                  <View style={styles.historyRow}>
                    <Text style={[
                      styles.historyPeriod,
                      item.periodKey === periodKey && styles.historyPeriodCurrent,
                    ]}>
                      {item.periodKey}
                      {item.periodKey === periodKey && ` (${language === 'en' ? 'current' : language === 'zh' ? '当前' : 'hiện tại'})`}
                    </Text>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(convertedAmount, settings.currency)}
                    </Text>
                  </View>
                  {index < convertedHistory.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 {language === 'en' ? 'Tips' : language === 'zh' ? '提示' : 'Mẹo'}</Text>
          <Text style={styles.tipsText}>
            {language === 'en'
              ? '• Daily < Weekly < Monthly < Yearly\n• Set budget based on income\n• Track daily spending'
              : language === 'zh'
              ? '• 日预算 < 周 < 月 < 年\n• 根据收入设置预算\n• 每日跟踪支出'
              : '• Hạn mức ngày < tuần < tháng < năm\n• Đặt hạn mức phù hợp với thu nhập\n• Theo dõi chi tiêu hàng ngày'}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t.budget.title} ({PERIOD_LABELS[targetPeriod]})
            </Text>
            <Text style={styles.modalSubtitle}>
              {getPeriodDisplayLabel()}
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.modalInput}
                value={budgetInput}
                onChangeText={handleInputChange}
                placeholder="0"
                placeholderTextColor={colors.sub}
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity
                style={styles.currencySelector}
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              >
                <Text style={styles.currencyFlag}>{currentCurrencyInfo.flag}</Text>
                <Text style={styles.currencyCode}>{inputCurrency}</Text>
                <Text style={styles.currencyChevron}>▼</Text>
              </TouchableOpacity>
            </View>

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

            {/* Constraints hint */}
            {!showCurrencyPicker && (constraints.maxLimit !== null || constraints.minLimit !== null) && (
              <View style={styles.constraintHint}>
                {constraints.minLimit !== null && (
                  <Text style={styles.constraintHintText}>
                    Min: {formatCurrency(constraints.minLimit, inputCurrency)}
                  </Text>
                )}
                {constraints.maxLimit !== null && (
                  <Text style={styles.constraintHintText}>
                    Max: {formatCurrency(constraints.maxLimit, inputCurrency)}
                  </Text>
                )}
              </View>
            )}

            {/* Validation error */}
            {!showCurrencyPicker && validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}

            {!showCurrencyPicker && periodBudget && (
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                <Text style={styles.removeBtnText}>{t.budget.delete}</Text>
              </TouchableOpacity>
            )}

            {!showCurrencyPicker && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtnSecondary}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.modalBtnSecondaryText}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtnPrimary,
                    validationError && styles.modalBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!!validationError}
                >
                  <Text style={styles.modalBtnPrimaryText}>{t.common.save}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.sub,
    marginTop: 2,
  },
  editBtn: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.accent,
  },
  budgetMain: {
    marginBottom: spacing.lg,
  },
  spentLabel: {
    fontSize: fontSize.sm,
    color: colors.sub,
    marginBottom: 4,
  },
  spentAmount: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  overspent: {
    color: colors.red,
  },
  progressContainer: {
    gap: 8,
  },
  progressBg: {
    height: 10,
    backgroundColor: colors.card2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 5,
  },
  progressOverspent: {
    backgroundColor: colors.red,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  noBudget: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  noBudgetIcon: {
    fontSize: 48,
  },
  noBudgetText: {
    fontSize: fontSize.md,
    color: colors.sub,
    textAlign: 'center',
  },
  setBudgetBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  setBudgetText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  constraintsCard: {
    backgroundColor: `${colors.orange ?? '#FAA64D'}20`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.orange ?? '#FAA64D'}40`,
  },
  constraintsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  constraintsText: {
    fontSize: fontSize.sm,
    color: colors.sub,
    lineHeight: 20,
  },
  historySection: {
    gap: spacing.md,
  },
  historyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyPeriod: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  historyPeriodCurrent: {
    color: colors.accent,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },
  tipsCard: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  tipsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipsText: {
    fontSize: fontSize.md,
    color: colors.sub,
    lineHeight: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    color: colors.sub,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  modalInput: {
    flex: 1,
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 16,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    gap: 4,
  },
  currencyFlag: {
    fontSize: 16,
  },
  currencyCode: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  currencyChevron: {
    fontSize: 10,
    color: colors.sub,
  },
  currencyDropdown: {
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  currencyOptionActive: {
    backgroundColor: `${colors.accent}20`,
  },
  currencyOptionFlag: {
    fontSize: 18,
  },
  currencyOptionCode: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  currencyOptionSymbol: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  currencyCheckmark: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  constraintHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  constraintHintText: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.red,
    textAlign: 'center',
  },
  removeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  removeBtnText: {
    fontSize: fontSize.md,
    color: colors.red,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card2,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.sub,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnPrimaryText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
});
