// Stat card component for income/expense display

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize, spacing } from './theme';
import { formatCurrency } from '../utils';
import { useAppStore } from '../store';

interface StatCardProps {
  label: string;
  value: number;
  type: 'income' | 'expense';
}

export function StatCard({ label, value, type }: StatCardProps) {
  const { settings } = useAppStore();
  const color = type === 'income' ? colors.green : colors.red;
  const sign = type === 'income' ? '+' : '-';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color }]}>
        {sign}{formatCurrency(value, settings.currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.sub,
  },
  value: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
  },
});
