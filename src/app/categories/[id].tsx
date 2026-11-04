// Category detail screen with budget management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store';
import {
  colors,
  spacing,
  radius,
  fontSize,
  CategoryIcon,
  showAlert,
} from '@/components';
import { formatCurrency, formatNumber, parseNumber, getPeriodRange, getRangeStrings } from '@/utils';
import { setCategoryDefaultBudget, getTotalByDateRangeAndCategory } from '@/db';
import { useI18n } from '@/i18n/context';
import type { Period } from '@/types';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, deleteCategory, loadCategories, settings } = useAppStore();
  const { t, format } = useI18n();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');
  const [budgetInput, setBudgetInput] = useState('');
  const [spent, setSpent] = useState(0);

  const category = categories.find((c) => c.id === parseInt(id, 10));
  const isExpense = category?.type === 'expense';

  // Period labels from translations
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'daily', label: t.budget.daily },
    { key: 'weekly', label: t.budget.weekly },
    { key: 'monthly', label: t.budget.monthly },
    { key: 'annually', label: t.budget.annually },
  ];

  // Load budget and spent when period changes
  useEffect(() => {
    if (!category || !isExpense) return;

    const loadData = async () => {
      // Load current budget
      const currentBudget = category.defaultBudgets[selectedPeriod];
      setBudgetInput(currentBudget ? formatNumber(currentBudget) : '');

      // Load spent for current period
      const range = getPeriodRange(selectedPeriod, new Date(), settings.weekStart);
      const { startDate, endDate } = getRangeStrings(range);
      const spentAmount = await getTotalByDateRangeAndCategory(
        startDate,
        endDate,
        'expense',
        category.id
      );
      setSpent(spentAmount);
    };

    loadData();
  }, [category?.id, selectedPeriod, category?.defaultBudgets, settings.weekStart, isExpense]);

  if (!category) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t.category.notFound}</Text>
      </View>
    );
  }

  const handleDelete = () => {
    showAlert(
      t.category.delete,
      format(t.category.deleteConfirm, { name: category.name }),
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.delete, style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    await deleteCategory(category.id);
    router.back();
  };

  const handleBudgetChange = (text: string) => {
    const parsed = parseNumber(text);
    setBudgetInput(parsed > 0 ? formatNumber(parsed) : '');
  };

  const handleSaveBudget = async () => {
    const amount = parseNumber(budgetInput);
    await setCategoryDefaultBudget(category.id, selectedPeriod, amount > 0 ? amount : null);
    await loadCategories();
  };

  const handleClearBudget = async () => {
    setBudgetInput('');
    await setCategoryDefaultBudget(category.id, selectedPeriod, null);
    await loadCategories();
  };

  const currentBudget = category.defaultBudgets[selectedPeriod];
  const remaining = currentBudget ? Math.max(0, currentBudget - spent) : null;
  const progress = currentBudget ? Math.min(spent / currentBudget, 1) : 0;
  const isOverBudget = currentBudget ? spent > currentBudget : false;

  const getPeriodLabel = (period: Period): string => {
    switch (period) {
      case 'daily': return t.budget.todayBudget;
      case 'weekly': return t.budget.weekBudget;
      case 'monthly': return t.budget.monthBudget;
      case 'annually': return t.budget.yearBudget;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.category.detail}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/categories/create?id=${category.id}`)}
          >
            <Text style={styles.editText}>{t.common.edit}</Text>
          </TouchableOpacity>
        </View>

        {/* Category info */}
        <View style={styles.infoCard}>
          <View style={[styles.iconWrapper, { backgroundColor: `${category.color}20` }]}>
            <CategoryIcon icon={category.icon} color={category.color} size={48} />
          </View>
          <Text style={styles.catName}>{category.name}</Text>
          <View style={[
            styles.typeBadge,
            { backgroundColor: isExpense ? `${colors.red}15` : `${colors.green}15` }
          ]}>
            <Text style={[
              styles.typeText,
              { color: isExpense ? colors.red : colors.green }
            ]}>
              {isExpense ? t.category.expense : t.category.income}
            </Text>
          </View>
        </View>

        {/* Budget Section - Only for expense categories */}
        {isExpense && (
          <View style={styles.budgetSection}>
            {/* Period Tabs */}
            <View style={styles.periodTabs}>
              {PERIODS.map(({ key, label }) => {
                const isActive = selectedPeriod === key;
                const hasBudget = category.defaultBudgets[key] != null;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.periodTab,
                      isActive && styles.periodTabActive,
                    ]}
                    onPress={() => setSelectedPeriod(key)}
                  >
                    <Text style={[
                      styles.periodTabText,
                      isActive && styles.periodTabTextActive,
                    ]}>
                      {label}
                    </Text>
                    {hasBudget && !isActive && (
                      <View style={styles.hasBudgetDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Budget Input */}
            <View style={styles.budgetInputSection}>
              <Text style={styles.inputLabel}>
                {getPeriodLabel(selectedPeriod)}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.budgetInput}
                  value={budgetInput}
                  onChangeText={handleBudgetChange}
                  keyboardType="numeric"
                  placeholder={t.budget.noLimit}
                  placeholderTextColor={colors.sub}
                />
                <Text style={styles.currency}>₫</Text>
              </View>
            </View>

            {/* Stats - only show if budget is set */}
            {currentBudget && (
              <View style={styles.statsSection}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t.budget.spent}</Text>
                  <Text style={[
                    styles.statValue,
                    isOverBudget && styles.statValueOver
                  ]}>
                    {formatCurrency(spent, settings.currency)}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t.budget.remaining}</Text>
                  <Text style={[
                    styles.statValue,
                    { color: isOverBudget ? colors.red : colors.green }
                  ]}>
                    {isOverBudget
                      ? `-${formatCurrency(spent - currentBudget, settings.currency)}`
                      : formatCurrency(remaining ?? 0, settings.currency)
                    }
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: isOverBudget ? colors.red : category.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveBudget}
              >
                <Text style={styles.saveBtnText}>{t.common.save}</Text>
              </TouchableOpacity>

              {currentBudget && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearBudget}
                >
                  <Text style={styles.clearBtnText}>{t.category.clearBudget}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Quick summary for expense categories */}
        {isExpense && (
          <View style={styles.quickSummary}>
            <Text style={styles.quickSummaryTitle}>{t.budget.allBudgets}</Text>
            <View style={styles.quickSummaryGrid}>
              {PERIODS.map(({ key, label }) => {
                const budget = category.defaultBudgets[key];
                return (
                  <View key={key} style={styles.quickSummaryItem}>
                    <Text style={styles.quickSummaryLabel}>{label}</Text>
                    <Text style={[
                      styles.quickSummaryValue,
                      !budget && styles.quickSummaryValueEmpty
                    ]}>
                      {budget ? formatCurrency(budget, settings.currency) : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>{t.category.delete}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    gap: spacing.lg,
  },
  // Header
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
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent,
  },
  // Info Card
  infoCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.xl,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  typeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Budget Section
  budgetSection: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // Period Tabs
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    position: 'relative',
  },
  periodTabActive: {
    backgroundColor: colors.accent,
  },
  periodTabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  periodTabTextActive: {
    color: '#fff',
  },
  hasBudgetDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  // Budget Input
  budgetInputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.sub,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  budgetInput: {
    flex: 1,
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 16,
  },
  currency: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.sub,
  },
  // Stats
  statsSection: {
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.base,
    color: colors.sub,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  statValueOver: {
    color: colors.red,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
    width: 40,
    textAlign: 'right',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  clearBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.red,
  },
  // Quick Summary
  quickSummary: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  quickSummaryTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.sub,
  },
  quickSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickSummaryItem: {
    width: '48%',
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quickSummaryLabel: {
    fontSize: fontSize.sm,
    color: colors.sub,
    marginBottom: 4,
  },
  quickSummaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  quickSummaryValueEmpty: {
    color: colors.sub,
  },
  // Delete
  deleteBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red,
    marginTop: spacing.md,
  },
  deleteBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.red,
  },
  errorText: {
    color: colors.sub,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: 100,
  },
});
