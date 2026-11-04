// Create / Edit Category screen

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, categoryColors, categoryIcons, showAlert } from '@/components';
import type { TransactionType } from '@/types';

export default function CreateCategoryScreen() {
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { categories, createCategory, updateCategory } = useAppStore();

  const existing = id ? categories.find((c) => c.id === parseInt(id, 10)) : null;
  const isEdit = !!existing;

  // Default type from param or existing category
  const defaultType: TransactionType = (typeParam as TransactionType) ?? existing?.type ?? 'expense';

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? categoryIcons[0]);
  const [color, setColor] = useState(existing?.color ?? categoryColors[0]);
  const [categoryType, setCategoryType] = useState<TransactionType>(defaultType);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }

    if (isEdit && existing) {
      await updateCategory(existing.id, {
        name: name.trim(),
        icon,
        color,
        type: categoryType,
      });
    } else {
      await createCategory({
        name: name.trim(),
        icon,
        color,
        type: categoryType,
        monthlyBudget: null,
      });
    }

    router.back();
  }, [name, categoryType, isEdit, existing, icon, color, updateCategory, createCategory]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEdit ? 'Sửa danh mục' : 'Danh mục mới'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, categoryType === 'expense' && styles.typeBtnExpense]}
            onPress={() => setCategoryType('expense')}
          >
            <Text
              style={[
                styles.typeLabel,
                categoryType === 'expense' && styles.typeLabelActive,
              ]}
            >
              Chi tiêu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, categoryType === 'income' && styles.typeBtnIncome]}
            onPress={() => setCategoryType('income')}
          >
            <Text
              style={[
                styles.typeLabel,
                categoryType === 'income' && styles.typeLabelActive,
              ]}
            >
              Thu nhập
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <View
            style={[
              styles.previewChip,
              { backgroundColor: `${color}38`, borderColor: color },
            ]}
          >
            <Text style={styles.previewIcon}>{icon}</Text>
          </View>
          <Text style={styles.previewName}>{name || 'Tên danh mục'}</Text>
          <Text style={[
            styles.previewType,
            categoryType === 'income' && styles.previewTypeIncome,
          ]}>
            {categoryType === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
          </Text>
        </View>

        {/* Name input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tên danh mục</Text>
          <TextInput
            style={[styles.input, styles.inputFocused]}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên danh mục"
            placeholderTextColor={colors.sub}
          />
        </View>

        {/* Icon picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Chọn biểu tượng</Text>
          <View style={styles.iconGrid}>
            {categoryIcons.map((ic) => (
              <TouchableOpacity
                key={ic}
                style={[
                  styles.iconCell,
                  icon === ic && { backgroundColor: `${color}38`, borderColor: color, borderWidth: 1.5 },
                ]}
                onPress={() => setIcon(ic)}
              >
                <Text style={styles.iconText}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Chọn màu</Text>
          <View style={styles.colorRow}>
            {categoryColors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  color === c && styles.colorSwatchSelected,
                ]}
                onPress={() => setColor(c)}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            categoryType === 'income' && styles.saveBtnIncome,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: spacing.xl,
  },
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
  placeholder: {
    width: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  typeBtnExpense: {
    backgroundColor: colors.red,
  },
  typeBtnIncome: {
    backgroundColor: colors.green,
  },
  typeLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.sub,
  },
  typeLabelActive: {
    color: colors.text,
  },
  preview: {
    alignItems: 'center',
    gap: 10,
  },
  previewChip: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  previewIcon: {
    fontSize: 36,
  },
  previewName: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  previewType: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.red,
    backgroundColor: `${colors.red}24`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  previewTypeIncome: {
    color: colors.green,
    backgroundColor: `${colors.green}24`,
  },
  fieldGroup: {
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.sub,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnIncome: {
    backgroundColor: colors.green,
  },
  saveBtnText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
});
