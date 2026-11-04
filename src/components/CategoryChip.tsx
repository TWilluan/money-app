// Category chip component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from './theme';
import type { Category } from '../types';

interface CategoryChipProps {
  category: Category;
  selected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function CategoryChip({
  category,
  selected = false,
  onPress,
  size = 'medium',
}: CategoryChipProps) {
  const sizeStyles = {
    small: { chip: styles.chipSmall, icon: styles.iconSmall, text: styles.textSmall },
    medium: { chip: styles.chipMedium, icon: styles.iconMedium, text: styles.textMedium },
    large: { chip: styles.chipLarge, icon: styles.iconLarge, text: styles.textLarge },
  };

  const chipStyle = [
    styles.chip,
    sizeStyles[size].chip,
    { backgroundColor: selected ? `${category.color}38` : colors.card },
    selected && { borderColor: category.color, borderWidth: 1.5 },
  ];

  const content = (
    <>
      <View style={[styles.iconContainer, sizeStyles[size].icon, { backgroundColor: `${category.color}30` }]}>
        <Text style={sizeStyles[size].text}>{category.icon}</Text>
      </View>
      {size !== 'small' && (
        <Text style={[styles.label, selected ? styles.labelActive : null]}>
          {category.name}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
}

// Simple icon-only chip for lists
interface CategoryIconProps {
  icon: string;
  color: string;
  size?: number;
}

export function CategoryIcon({ icon, color, size = 40 }: CategoryIconProps) {
  return (
    <View
      style={[
        styles.iconOnly,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: `${color}30`,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    gap: 8,
  },
  chipSmall: {
    padding: 6,
  },
  chipMedium: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipLarge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  iconSmall: {
    width: 28,
    height: 28,
  },
  iconMedium: {
    width: 32,
    height: 32,
  },
  iconLarge: {
    width: 40,
    height: 40,
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 20,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
  },
  labelActive: {
    color: colors.text,
  },
  iconOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
