// Category list item with progress bar

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, fontSize, spacing } from './theme';
import { CategoryIcon } from './CategoryChip';
import { formatCurrency } from '../utils';
import { useAppStore } from '../store';
import type { CategoryTotal } from '../types';

interface CategoryRowProps {
  data: CategoryTotal;
  onPress?: () => void;
  showDivider?: boolean;
}

export function CategoryRow({ data, onPress, showDivider = true }: CategoryRowProps) {
  const { settings } = useAppStore();
  const { category, total, percentage } = data;

  const content = (
    <View style={styles.container}>
      <View style={styles.row}>
        <CategoryIcon icon={category.icon} color={category.color} size={40} />

        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{category.name}</Text>
            <View style={styles.rightSection}>
              <Text style={styles.amount}>{formatCurrency(total, settings.currency)}</Text>
              {onPress && <Text style={styles.arrow}>›</Text>}
            </View>
          </View>

          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(percentage * 100, 100)}%`,
                  backgroundColor: category.color,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {showDivider && <View style={styles.divider} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  middle: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  arrow: {
    fontSize: 20,
    color: colors.sub,
    fontWeight: '300',
  },
  barBg: {
    height: 6,
    backgroundColor: colors.card2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },
});
