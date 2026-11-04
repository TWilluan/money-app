// Category detail screen - shows transactions for category in selected period

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, CategoryIcon, SwipeableRow, showAlert } from '@/components';
import { formatCurrency, formatDate, getPeriodRange, getRangeStrings } from '@/utils';
import { getTransactionsByCategory } from '@/db';
import { useI18n } from '@/i18n/context';
import type { Transaction } from '@/types';

// Conditionally import GestureHandlerRootView for native
let GestureHandlerRootView: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
  } catch (e) {
    // Gesture handler not available
  }
}

// Wrapper that uses GestureHandlerRootView on native, View on web
const RootWrapper: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => {
  if (GestureHandlerRootView) {
    return <GestureHandlerRootView style={style}>{children}</GestureHandlerRootView>;
  }
  return <View style={style}>{children}</View>;
};

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id, 10);
  const { t, language } = useI18n();
  const locale = language;

  const {
    categories,
    selectedPeriod,
    viewingDate,
    settings,
    currentSummary,
    deleteTransaction,
    deleteCategory,
  } = useAppStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const category = categories.find(c => c.id === categoryId);
  // Check both expense and income totals for the category
  const categoryTotal = currentSummary?.categoryTotals.find(ct => ct.categoryId === categoryId)
    ?? currentSummary?.incomeTotals?.find(ct => ct.categoryId === categoryId);

  const loadTransactionsData = useCallback(async () => {
    if (!category) return;

    const range = getPeriodRange(selectedPeriod, viewingDate, settings.weekStart);
    const { startDate, endDate } = getRangeStrings(range);
    const txns = await getTransactionsByCategory(categoryId, startDate, endDate);
    setTransactions(txns);
  }, [categoryId, selectedPeriod, viewingDate, settings.weekStart, category]);

  // Reload when returning to this screen (currentSummary changes after transaction edit)
  useEffect(() => {
    loadTransactionsData();
  }, [loadTransactionsData, currentSummary]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionsData();
    setRefreshing(false);
  };

  const handleEditTransaction = (txn: Transaction) => {
    router.push(`/transaction/${txn.id}`);
  };

  const handleDeleteTransaction = async (txn: Transaction) => {
    showAlert(
      t.transaction.deleteTransaction,
      `${t.common.delete} ${formatCurrency(txn.amount, settings.currency)}?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(txn.id);
            // deleteTransaction already calls loadSummary
            await loadTransactionsData();
          },
        },
      ]
    );
  };

  const handleEditCategory = () => {
    router.push(`/categories/create?id=${categoryId}`);
  };

  const handleDeleteCategory = () => {
    if (!category) return;

    showAlert(
      t.category.delete,
      `${t.common.delete} "${category.name}"?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(categoryId);
            router.back();
          },
        },
      ]
    );
  };

  if (!category) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.category.notFound}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  const periodLabel = selectedPeriod === 'daily' ? t.home.today
    : selectedPeriod === 'weekly' ? t.home.thisWeek
    : selectedPeriod === 'monthly' ? t.home.thisMonth
    : t.home.thisYear;

  return (
    <RootWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{category.name}</Text>
        <TouchableOpacity onPress={handleEditCategory} style={styles.editBtn}>
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Category summary card */}
        <View style={styles.summaryCard}>
          <CategoryIcon icon={category.icon} color={category.color} size={64} />
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(categoryTotal?.total ?? 0, settings.currency)}</Text>
          <Text style={styles.periodLabel}>{periodLabel}</Text>

          {category.monthlyBudget && category.monthlyBudget > 0 && (
            <View style={styles.budgetInfo}>
              <View style={styles.budgetBarBg}>
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${Math.min((categoryTotal?.total ?? 0) / category.monthlyBudget * 100, 100)}%`,
                      backgroundColor: (categoryTotal?.total ?? 0) > category.monthlyBudget ? colors.red : category.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetText}>
                {t.budget.monthBudget}: {formatCurrency(category.monthlyBudget, settings.currency)}
              </Text>
            </View>
          )}
        </View>

        {/* Transactions list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.transaction.add.replace('Thêm ', '')} ({transactions.length})</Text>
        </View>

        {transactions.length > 0 ? (
          <View style={styles.transactionList}>
            {transactions.map((txn, index) => (
              <SwipeableRow
                key={txn.id}
                onDelete={() => handleDeleteTransaction(txn)}
              >
                <TouchableOpacity
                  style={styles.transactionRow}
                  onPress={() => handleEditTransaction(txn)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txnLeft}>
                    <Text style={styles.txnDate}>{formatDate(txn.date, locale)}</Text>
                    {txn.note ? <Text style={styles.txnNote} numberOfLines={1}>{txn.note}</Text> : null}
                  </View>
                  <View style={styles.txnRight}>
                    <Text style={[styles.txnAmount, txn.type === 'income' && styles.txnIncome]}>
                      {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount, settings.currency)}
                    </Text>
                    <Text style={styles.arrowIcon}>›</Text>
                  </View>
                </TouchableOpacity>
                {index < transactions.length - 1 && <View style={styles.divider} />}
              </SwipeableRow>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t.home.noTransactions}</Text>
            <Text style={styles.emptySubtext}>{periodLabel.toLowerCase()}</Text>
          </View>
        )}

        {/* Hint */}
        <Text style={styles.hint}>
          {Platform.OS === 'web' ? t.category.holdToDelete : t.home.swipeHint}
        </Text>
      </ScrollView>
    </RootWrapper>
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
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  editBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  // Summary card
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryName: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  totalAmount: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  periodLabel: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  budgetInfo: {
    width: '100%',
    marginTop: spacing.md,
    gap: 6,
  },
  budgetBarBg: {
    height: 8,
    backgroundColor: colors.card2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetText: {
    fontSize: fontSize.sm,
    color: colors.sub,
    textAlign: 'center',
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  // Transactions
  transactionList: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  txnLeft: {
    flex: 1,
    gap: 2,
  },
  txnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txnDate: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  txnNote: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  txnAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.red,
  },
  txnIncome: {
    color: colors.green,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.sub,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
    marginLeft: spacing.lg,
  },
  // Empty state
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 4,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
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
  hint: {
    fontSize: fontSize.sm,
    color: colors.sub,
    textAlign: 'center',
    opacity: 0.6,
  },
});
