// Period toggle component (Day / Week / Month / Year)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from './theme';
import type { Period } from '../types';
import { useI18n } from '@/i18n/context';

interface PeriodToggleProps {
  selected: Period;
  onChange: (period: Period) => void;
}

export function PeriodToggle({ selected, onChange }: PeriodToggleProps) {
  const { t } = useI18n();

  const periods: { key: Period; label: string }[] = [
    { key: 'daily', label: t.period.day },
    { key: 'weekly', label: t.period.week },
    { key: 'monthly', label: t.period.month },
    { key: 'annually', label: t.period.year },
  ];

  return (
    <View style={styles.container}>
      {periods.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.segment, selected === key && styles.segmentActive]}
          onPress={() => onChange(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, selected === key && styles.labelActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
  },
  labelActive: {
    color: colors.text,
  },
});
