// Categories list screen

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, CategoryIcon, BottomTabBar } from '@/components';
import { useI18n } from '@/i18n/context';
import type { TransactionType } from '@/types';

export default function CategoriesScreen() {
  const { categories } = useAppStore();
  const { t } = useI18n();
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter(cat => cat.type === filterType);
  }, [categories, filterType]);

  // Group by type for display
  const expenseCategories = useMemo(() =>
    categories.filter(cat => cat.type === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(() =>
    categories.filter(cat => cat.type === 'income'),
    [categories]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.category.title}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/categories/create')}
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addLabel}>{t.common.add}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
              {t.common.all} ({categories.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'expense' && styles.filterTabExpense]}
            onPress={() => setFilterType('expense')}
          >
            <Text style={[styles.filterTabText, filterType === 'expense' && styles.filterTabTextActive]}>
              {t.category.expense} ({expenseCategories.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'income' && styles.filterTabIncome]}
            onPress={() => setFilterType('income')}
          >
            <Text style={[styles.filterTabText, filterType === 'income' && styles.filterTabTextActive]}>
              {t.category.income} ({incomeCategories.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category list */}
        {filterType === 'all' ? (
          <>
            {/* Expense section */}
            {expenseCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t.category.expenseCategories.toUpperCase()}</Text>
                <View style={styles.list}>
                  {expenseCategories.map((cat, index) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      showDivider={index < expenseCategories.length - 1}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Income section */}
            {incomeCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t.category.incomeCategories.toUpperCase()}</Text>
                <View style={styles.list}>
                  {incomeCategories.map((cat, index) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      showDivider={index < incomeCategories.length - 1}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.list}>
            {filteredCategories.map((cat, index) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                showDivider={index < filteredCategories.length - 1}
                t={t}
              />
            ))}
          </View>
        )}

        {categories.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.common.noData}</Text>
            <Text style={styles.emptySubtext}>{t.category.add}</Text>
          </View>
        )}
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

interface CategoryRowProps {
  category: {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
    monthlyBudget: number | null;
  };
  showDivider: boolean;
  t: any;
}

function CategoryRow({ category, showDivider, t }: CategoryRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/categories/${category.id}`)}
      activeOpacity={0.7}
    >
      <CategoryIcon icon={category.icon} color={category.color} size={44} />

      <View style={styles.rowMiddle}>
        <View style={styles.rowNameRow}>
          <Text style={styles.catName}>{category.name}</Text>
          <Text style={[
            styles.typeBadge,
            category.type === 'income' && styles.typeBadgeIncome,
          ]}>
            {category.type === 'expense' ? t.category.expense : t.category.income}
          </Text>
        </View>
        <Text style={styles.catDesc}>
          {category.type === 'expense' ? t.category.expenseCategories : t.category.incomeCategories}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>

      {showDivider && <View style={styles.divider} />}
    </TouchableOpacity>
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
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  addLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  filterTabActive: {
    backgroundColor: colors.accent,
  },
  filterTabExpense: {
    backgroundColor: colors.red,
  },
  filterTabIncome: {
    backgroundColor: colors.green,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  filterTabTextActive: {
    color: colors.text,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
    paddingLeft: 4,
  },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowMiddle: {
    flex: 1,
    gap: 3,
  },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  typeBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.red,
    backgroundColor: `${colors.red}24`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  typeBadgeIncome: {
    color: colors.green,
    backgroundColor: `${colors.green}24`,
  },
  catDesc: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  chevron: {
    fontSize: 20,
    color: colors.sub,
  },
  divider: {
    position: 'absolute',
    left: 58,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.card2,
  },
  empty: {
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
