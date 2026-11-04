// Stats screen - earnings vs spending with interactive bar chart + trend line

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, PeriodToggle, BottomTabBar } from '@/components';
import { formatCurrency, getChartLabels, getPeriodRange, getRangeStrings } from '@/utils';
import { getTransactionsByDateRangeRaw } from '@/db';
import { convertCurrency } from '@/services/exchangeRates';
import { useI18n } from '@/i18n/context';
import type { Period, TransactionType, Currency } from '@/types';

interface BarData {
  label: string;
  value: number;
  refDate: Date;
  startDate: string;
  endDate: string;
}

interface DonutSegment {
  categoryId: number;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

type StatsTab = 'expense' | 'income';

export default function StatsScreen() {
  const { categories, settings } = useAppStore();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<StatsTab>('expense');
  const [period, setPeriod] = useState<Period>('monthly');
  const [barData, setBarData] = useState<BarData[]>([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(5);
  const [donutData, setDonutData] = useState<DonutSegment[]>([]);

  // Period labels for trend text
  const PERIOD_LABELS: Record<Period, string> = useMemo(() => ({
    daily: t.period.daily.toLowerCase(),
    weekly: t.period.weekly.toLowerCase(),
    monthly: t.period.monthly.toLowerCase(),
    annually: t.period.annually.toLowerCase(),
  }), [t]);

  // Load bar chart data when period or tab changes or currency changes
  useEffect(() => {
    loadBarData();
  }, [period, activeTab, settings.weekStart, settings.currency]);

  // Load donut data when selected bar changes
  useEffect(() => {
    if (barData.length > 0 && selectedBarIndex >= 0 && selectedBarIndex < barData.length) {
      loadDonutData(barData[selectedBarIndex]);
    }
  }, [selectedBarIndex, barData, categories, activeTab, period]);

  const loadBarData = async () => {
    const transactionType: TransactionType = activeTab;
    const displayCurrency = settings.currency as Currency;
    const labels = getChartLabels(period, 6);
    const now = new Date();
    const bars: BarData[] = [];

    for (let i = 5; i >= 0; i--) {
      const refDate = new Date(now);
      // Reset time to start of day to avoid timezone issues
      refDate.setHours(0, 0, 0, 0);
      // Set to 1st of month to avoid overflow when changing months
      refDate.setDate(1);

      switch (period) {
        case 'daily':
          refDate.setDate(now.getDate() - i);
          break;
        case 'weekly':
          refDate.setDate(now.getDate() - i * 7);
          break;
        case 'monthly':
          refDate.setMonth(now.getMonth() - i);
          break;
        case 'annually':
          refDate.setFullYear(now.getFullYear() - i);
          break;
      }

      const range = getPeriodRange(period, refDate, settings.weekStart);
      const { startDate, endDate } = getRangeStrings(range);

      // Get raw transactions and convert to display currency
      const transactions = await getTransactionsByDateRangeRaw(startDate, endDate, transactionType, period);
      let total = 0;
      for (const tx of transactions) {
        const converted = await convertCurrency(tx.amount, tx.currency, displayCurrency);
        total += converted;
      }
      total = Math.round(total * 100) / 100;

      bars.push({
        label: labels[5 - i],
        value: total,
        refDate,
        startDate,
        endDate,
      });
    }

    setBarData(bars);
    setSelectedBarIndex(5);
  };

  const loadDonutData = async (bar: BarData) => {
    const transactionType: TransactionType = activeTab;
    const displayCurrency = settings.currency as Currency;

    // Get raw transactions and group by category with currency conversion
    const transactions = await getTransactionsByDateRangeRaw(bar.startDate, bar.endDate, transactionType, period);
    const categoryTotalsMap = new Map<number, number>();

    for (const tx of transactions) {
      const converted = await convertCurrency(tx.amount, tx.currency, displayCurrency);
      const current = categoryTotalsMap.get(tx.categoryId) ?? 0;
      categoryTotalsMap.set(tx.categoryId, current + converted);
    }

    const total = bar.value;
    const segments: DonutSegment[] = Array.from(categoryTotalsMap.entries())
      .map(([categoryId, catTotal]) => {
        const cat = categories.find((c) => c.id === categoryId);
        const roundedTotal = Math.round(catTotal * 100) / 100;
        return {
          categoryId,
          name: cat?.name ?? t.common.other,
          color: cat?.color ?? '#999',
          total: roundedTotal,
          percentage: total > 0 ? roundedTotal / total : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    setDonutData(segments);
  };

  const handleBarPress = (index: number) => {
    setSelectedBarIndex(index);
  };

  const selectedBar = barData[selectedBarIndex];
  const selectedAmount = selectedBar?.value ?? 0;
  const isCurrentPeriod = selectedBarIndex === 5;
  const periodLabel = PERIOD_LABELS[period];
  const isExpense = activeTab === 'expense';
  const accentColor = isExpense ? colors.red : colors.green;

  // Transform data for gifted-charts BarChart
  const chartBarData = useMemo(() => {
    const mapped = barData.map((bar, index) => {
      const isCurrentPeriodBar = index === barData.length - 1;
      const isSelected = index === selectedBarIndex;

      return {
        value: bar.value || 0,
        label: bar.label,
        frontColor: isSelected ? accentColor : `${accentColor}40`,
        onPress: () => handleBarPress(index),
        // Highlight current period with bottom indicator
        barBorderRadius: 4,
        labelTextStyle: isCurrentPeriodBar
          ? { color: accentColor, fontWeight: '600' as const, fontSize: 10 }
          : { color: colors.sub, fontSize: 10 },
      };
    });
    return mapped;
  }, [barData, selectedBarIndex, accentColor]);

  // Line data for trend overlay (same values as bars)
  const lineData = useMemo(() => {
    return barData.map((bar) => ({ value: bar.value }));
  }, [barData]);

  // Transform data for PieChart
  const pieData = useMemo(() => {
    if (donutData.length === 0) return [];
    return donutData.map((seg) => ({
      value: seg.total,
      color: seg.color,
      text: `${Math.round(seg.percentage * 100)}%`,
    }));
  }, [donutData]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.stats.title}</Text>
          <Text style={styles.subtitle}>{t.stats.subtitle}</Text>
        </View>

        {/* Tab toggle */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'expense' && styles.tabBtnActiveExpense]}
            onPress={() => setActiveTab('expense')}
          >
            <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>
              {t.stats.expense}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'income' && styles.tabBtnActiveIncome]}
            onPress={() => setActiveTab('income')}
          >
            <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
              {t.stats.income}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period toggle */}
        <PeriodToggle selected={period} onChange={setPeriod} />

        {/* Bar chart card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>
              {isExpense ? t.stats.expense : t.stats.income} - {selectedBar?.label ?? ''}
              {isCurrentPeriod ? ` (${t.stats.current})` : ''}
            </Text>
            <Text style={[styles.chartTotal, !isExpense && styles.chartTotalIncome]}>
              {formatCurrency(selectedAmount, settings.currency)}
            </Text>
          </View>

          {/* Bar chart using gifted-charts */}
          {chartBarData.length > 0 && (
            <View style={styles.chartWrapper}>
              <BarChart
                key={`${activeTab}-${period}`}
                data={chartBarData}
                barWidth={32}
                spacing={12}
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: colors.sub, fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(...barData.map(b => b.value), 1) * 1.1}
                height={140}
                isAnimated={false}
              />
            </View>
          )}

          {/* Trend indicator */}
          {barData.length >= 2 && (
            <View style={styles.trendRow}>
              {(() => {
                const prev = barData[selectedBarIndex - 1]?.value ?? 0;
                const curr = selectedAmount;
                const diff = curr - prev;
                const pct = prev > 0 ? Math.abs(diff / prev * 100) : 0;
                const isUp = diff > 0;
                const trendColor = isExpense ? (isUp ? colors.red : colors.green) : (isUp ? colors.green : colors.red);

                if (selectedBarIndex === 0 || prev === 0) {
                  return <Text style={styles.trendText}>—</Text>;
                }

                return (
                  <>
                    <Text style={[styles.trendArrow, { color: trendColor }]}>
                      {isUp ? '↑' : '↓'}
                    </Text>
                    <Text style={[styles.trendText, { color: trendColor }]}>
                      {pct.toFixed(0)}% {t.stats.vsLastPeriod.replace('{period}', periodLabel)}
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Pie chart card */}
        <View style={styles.chartCard}>
          <Text style={styles.donutTitle}>
            {t.stats.byCategoryLabel} - {selectedBar?.label ?? ''}
          </Text>

          <View style={styles.donutRow}>
            {pieData.length > 0 ? (
              <View style={styles.donutWrapper}>
                <PieChart
                  data={pieData}
                  donut
                  radius={70}
                  innerRadius={45}
                  innerCircleColor={colors.card}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={[styles.pieCenterText, { color: accentColor }]}>
                        {donutData.length}
                      </Text>
                      <Text style={styles.pieCenterLabel}>{t.stats.categories}</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={styles.donutEmpty}>
                <Text style={styles.donutEmptyText}>{t.stats.noData}</Text>
              </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
              {donutData.slice(0, 5).map((seg) => (
                <View key={seg.categoryId} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                    <Text style={styles.legendName} numberOfLines={1}>{seg.name}</Text>
                  </View>
                  <Text style={styles.legendPercent}>
                    {Math.round(seg.percentage * 100)}%
                  </Text>
                </View>
              ))}
              {donutData.length === 0 && (
                <Text style={styles.emptyText}>{t.stats.noTransactions}</Text>
              )}
              {donutData.length > 5 && (
                <Text style={styles.moreText}>{t.stats.moreCategories.replace('{count}', String(donutData.length - 5))}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Category breakdown list */}
        {donutData.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>{t.stats.details}</Text>
            {donutData.map((seg) => (
              <View key={seg.categoryId} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.breakdownName}>{seg.name}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>{formatCurrency(seg.total, settings.currency)}</Text>
                  <Text style={styles.breakdownPct}>{Math.round(seg.percentage * 100)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    gap: 2,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  // Tab toggle
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  tabBtnActiveExpense: {
    backgroundColor: colors.red,
  },
  tabBtnActiveIncome: {
    backgroundColor: colors.green,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
  },
  tabTextActive: {
    color: '#fff',
  },
  // Chart card
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  chartHeader: {
    gap: 2,
  },
  chartLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.sub,
  },
  chartTotal: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.red,
  },
  chartTotalIncome: {
    color: colors.green,
  },
  chartWrapper: {
    marginLeft: -10,
  },
  // Trend
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.card2,
  },
  trendArrow: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.sub,
  },
  // Donut / Pie
  donutTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  pieCenterLabel: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
  donutEmpty: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutEmptyText: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  legendPercent: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.sub,
    fontStyle: 'italic',
  },
  moreText: {
    fontSize: fontSize.xs,
    color: colors.sub,
    fontStyle: 'italic',
  },
  // Breakdown
  breakdownCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  breakdownTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.card2,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownPct: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
});
