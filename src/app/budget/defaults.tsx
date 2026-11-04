// Default Budgets Settings Screen

import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, showAlert } from '@/components';
import { formatNumber, formatCurrency } from '@/utils';
import type { Period, DefaultBudgets } from '@/types';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Ngày',
  weekly: 'Tuần',
  monthly: 'Tháng',
  annually: 'Năm',
};

const PERIOD_ICONS: Record<Period, string> = {
  daily: '📅',
  weekly: '📆',
  monthly: '🗓️',
  annually: '📊',
};

const PERIOD_ORDER: Period[] = ['daily', 'weekly', 'monthly', 'annually'];

export default function DefaultBudgetsScreen() {
  const { settings, updateSettings } = useAppStore();
  const [budgets, setBudgets] = useState<DefaultBudgets>(settings.defaultBudgets);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setBudgets(settings.defaultBudgets);
  }, [settings.defaultBudgets]);

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setEditValue(budgets[period]?.toString() ?? '');
  };

  const handleSave = async () => {
    if (!editingPeriod) return;

    const newValue = editValue ? parseInt(editValue, 10) : null;

    // Validate hierarchy: daily < weekly < monthly < annually
    const newBudgets = { ...budgets, [editingPeriod]: newValue };
    const error = validateHierarchy(newBudgets, editingPeriod);

    if (error) {
      showAlert('Lỗi', error);
      return;
    }

    setBudgets(newBudgets);
    setEditingPeriod(null);
    setEditValue('');

    await updateSettings({ defaultBudgets: newBudgets });
  };

  const handleCancel = () => {
    setEditingPeriod(null);
    setEditValue('');
  };

  const handleClear = async (period: Period) => {
    const newBudgets = { ...budgets, [period]: null };
    setBudgets(newBudgets);
    await updateSettings({ defaultBudgets: newBudgets });
  };

  const validateHierarchy = (
    budgetValues: DefaultBudgets,
    changedPeriod: Period
  ): string | null => {
    const values = {
      daily: budgetValues.daily,
      weekly: budgetValues.weekly,
      monthly: budgetValues.monthly,
      annually: budgetValues.annually,
    };

    const newValue = values[changedPeriod];
    if (newValue === null) return null;

    // Check against parent periods (larger)
    const periodIndex = PERIOD_ORDER.indexOf(changedPeriod);
    for (let i = periodIndex + 1; i < PERIOD_ORDER.length; i++) {
      const parentPeriod = PERIOD_ORDER[i];
      const parentValue = values[parentPeriod];
      if (parentValue !== null && newValue > parentValue) {
        return `Hạn mức ${PERIOD_LABELS[changedPeriod]} không được vượt quá hạn mức ${PERIOD_LABELS[parentPeriod]} (${formatCurrency(parentValue, settings.currency)})`;
      }
    }

    // Check against child periods (smaller)
    for (let i = 0; i < periodIndex; i++) {
      const childPeriod = PERIOD_ORDER[i];
      const childValue = values[childPeriod];
      if (childValue !== null && newValue < childValue) {
        return `Hạn mức ${PERIOD_LABELS[changedPeriod]} phải lớn hơn hạn mức ${PERIOD_LABELS[childPeriod]} (${formatCurrency(childValue, settings.currency)})`;
      }
    }

    return null;
  };

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
          <Text style={styles.title}>Hạn mức mặc định</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Hạn mức mặc định được áp dụng khi bạn chưa đặt hạn mức cụ thể cho kỳ đó.
            Hiển thị với nhãn "(mặc định)" trên dashboard.
          </Text>
        </View>

        {/* Budget list */}
        <View style={styles.budgetList}>
          {PERIOD_ORDER.map((period) => (
            <View key={period} style={styles.budgetItem}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetIcon}>{PERIOD_ICONS[period]}</Text>
                <Text style={styles.budgetLabel}>{PERIOD_LABELS[period]}</Text>
                {budgets[period] !== null && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => handleClear(period)}
                  >
                    <Text style={styles.clearBtnText}>Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingPeriod === period ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editValue}
                    onChangeText={(text) => setEditValue(text.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="Nhập số tiền"
                    placeholderTextColor={colors.sub}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Lưu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.valueBox}
                  onPress={() => handleEdit(period)}
                >
                  <Text style={[
                    styles.valueText,
                    budgets[period] === null && styles.valueTextEmpty,
                  ]}>
                    {budgets[period] !== null
                      ? formatCurrency(budgets[period]!, settings.currency)
                      : 'Chưa đặt'}
                  </Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Hierarchy note */}
        <View style={styles.hierarchyNote}>
          <Text style={styles.hierarchyTitle}>Quy tắc hạn mức</Text>
          <Text style={styles.hierarchyText}>
            Ngày {'<'} Tuần {'<'} Tháng {'<'} Năm
          </Text>
          <Text style={styles.hierarchySubtext}>
            Hạn mức nhỏ hơn không được vượt quá hạn mức lớn hơn
          </Text>
        </View>
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
  infoBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.sub,
    lineHeight: 20,
  },
  budgetList: {
    gap: spacing.lg,
  },
  budgetItem: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetIcon: {
    fontSize: 20,
  },
  budgetLabel: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.red,
  },
  valueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  valueText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  valueTextEmpty: {
    color: colors.sub,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  editIcon: {
    fontSize: 16,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.sub,
  },
  hierarchyNote: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  hierarchyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  hierarchyText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
  },
  hierarchySubtext: {
    fontSize: fontSize.sm,
    color: colors.sub,
    textAlign: 'center',
  },
});
