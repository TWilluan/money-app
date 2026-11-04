// Dashboard / Home screen

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import {
  colors,
  spacing,
  radius,
  fontSize,
  PeriodToggle,
  PeriodNavigator,
  StatCard,
  CategoryRow,
  BottomTabBar,
} from '@/components';
import { formatCurrency, getPeriodLabel } from '@/utils';
import { useI18n } from '@/i18n/context';

export default function DashboardScreen() {
  const {
    selectedPeriod,
    setSelectedPeriod,
    viewingDate,
    setViewingDate,
    currentSummary,
    loadSummary,
    settings,
  } = useAppStore();
  const { t } = useI18n();

  const { currency } = settings;

  // Load summary when viewingDate changes
  useEffect(() => {
    loadSummary();
  }, [viewingDate]);

  const handlePeriodChange = (period: typeof selectedPeriod) => {
    setSelectedPeriod(period);
    // setSelectedPeriod already resets viewingDate to today and calls loadSummary
  };

  const handleDateChange = (date: Date) => {
    setViewingDate(date);
    // useEffect will trigger loadSummary
  };

  // Budget from summary (null if not set)
  const budgetLimit = currentSummary?.budgetLimit ?? null;
  const hasBudget = budgetLimit !== null && budgetLimit > 0;

  const totalExpense = currentSummary?.totalExpense ?? 0;
  const remaining = hasBudget ? Math.max(0, budgetLimit - totalExpense) : 0;
  const budgetProgress = hasBudget ? Math.min(totalExpense / budgetLimit, 1) : 0;
  const isOverBudget = hasBudget && totalExpense > budgetLimit;

  const getPeriodName = () => {
    switch (selectedPeriod) {
      case 'daily': return t.period.today.toLowerCase();
      case 'weekly': return t.period.thisWeek.toLowerCase();
      case 'monthly': return t.period.thisMonth.toLowerCase();
      case 'annually': return t.period.thisYear.toLowerCase();
    }
  };

  const handleCategoryPress = (categoryId: number) => {
    router.push(`/category/${categoryId}`);
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
          <Text style={styles.periodLabel}>
            {getPeriodLabel(selectedPeriod, viewingDate)}
          </Text>
        </View>

        {/* Period toggle */}
        <PeriodToggle selected={selectedPeriod} onChange={handlePeriodChange} />

        {/* Period navigator (calendar) */}
        <PeriodNavigator
          period={selectedPeriod}
          currentDate={viewingDate}
          onDateChange={handleDateChange}
        />

        {/* Balance card */}
        <TouchableOpacity
          style={styles.balanceCard}
          onPress={() => router.push(`/budget?date=${viewingDate.toISOString()}&period=${selectedPeriod}`)}
          activeOpacity={0.8}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>
              {t.transaction.expense} {getPeriodName()}
            </Text>
            {!hasBudget && (
              <Text style={styles.setBudgetHint}>{t.budget.set} ›</Text>
            )}
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(totalExpense, currency)}
          </Text>

          {hasBudget ? (
            <>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>
                  {isOverBudget ? t.budget.exceeded : t.budget.remaining}
                </Text>
                <Text style={[
                  styles.budgetRemaining,
                  isOverBudget && styles.budgetOverspent
                ]}>
                  {isOverBudget ? formatCurrency(totalExpense - budgetLimit, currency) : formatCurrency(remaining, currency)}
                </Text>
                <Text style={styles.budgetLabel}>/ {formatCurrency(budgetLimit, currency)}</Text>
              </View>

              <View style={styles.budgetBarBg}>
                <View
                  style={[
                    styles.budgetBarFill,
                    { width: `${Math.min(budgetProgress, 1) * 100}%` },
                    isOverBudget && styles.budgetBarOverspent,
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={styles.noBudgetHint}>
              {t.budget.notSet}
            </Text>
          )}
        </TouchableOpacity>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatCard
            label={t.home.income}
            value={currentSummary?.totalIncome ?? 0}
            type="income"
          />
          <StatCard
            label={t.home.expense}
            value={totalExpense}
            type="expense"
          />
        </View>

        {/* Category header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.category.expenseCategories}</Text>
          <TouchableOpacity onPress={() => router.push('/categories')}>
            <Text style={styles.sectionLink}>{t.common.all}</Text>
          </TouchableOpacity>
        </View>

        {/* Category list - Expenses */}
        <View style={styles.categoryList}>
          {currentSummary?.categoryTotals.slice(0, 5).map((ct, index) => (
            <CategoryRow
              key={ct.categoryId}
              data={ct}
              onPress={() => handleCategoryPress(ct.categoryId)}
              showDivider={index < Math.min(currentSummary.categoryTotals.length, 5) - 1}
            />
          ))}
          {(!currentSummary?.categoryTotals.length) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.home.noTransactions}</Text>
            </View>
          )}
        </View>

        {/* Income category header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.category.incomeCategories}</Text>
          <TouchableOpacity onPress={() => router.push('/categories?type=income')}>
            <Text style={styles.sectionLink}>{t.common.all}</Text>
          </TouchableOpacity>
        </View>

        {/* Category list - Income */}
        <View style={styles.categoryList}>
          {currentSummary?.incomeTotals?.slice(0, 5).map((ct, index) => (
            <CategoryRow
              key={ct.categoryId}
              data={ct}
              onPress={() => handleCategoryPress(ct.categoryId)}
              showDivider={index < Math.min(currentSummary.incomeTotals?.length ?? 0, 5) - 1}
            />
          ))}
          {(!currentSummary?.incomeTotals?.length) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.home.noTransactions}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomTabBar />
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
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  periodLabel: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.sub,
  },
  setBudgetHint: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.accent,
  },
  defaultBudgetHint: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.sub,
    fontStyle: 'italic',
  },
  noBudgetHint: {
    fontSize: fontSize.sm,
    color: colors.sub,
    marginTop: 8,
    fontStyle: 'italic',
  },
  balanceAmount: {
    fontSize: fontSize['5xl'],
    fontWeight: '700',
    color: colors.red,
    letterSpacing: -0.5,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  budgetLabel: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  budgetRemaining: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.green,
  },
  budgetOverspent: {
    color: colors.red,
  },
  budgetBarBg: {
    height: 8,
    backgroundColor: colors.card2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    backgroundColor: colors.red,
    borderRadius: 4,
  },
  budgetBarOverspent: {
    backgroundColor: colors.red,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  sectionLink: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.accent,
  },
  categoryList: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: 8,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.sub,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.sub,
    opacity: 0.7,
  },
});
