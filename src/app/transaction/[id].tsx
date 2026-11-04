// Transaction edit screen

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, CategoryIcon, showAlert } from '@/components';
import { formatCurrency, formatNumber, parseVND, formatDate, toDateString } from '@/utils';
import { getTransactionById } from '@/db';
import { useI18n } from '@/i18n/context';
import type { Transaction } from '@/types';

export default function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id, 10);
  const { t, locale } = useI18n();

  // Memoized locale-specific constants
  const { MONTHS, DAYS } = useMemo(() => ({
    MONTHS: locale === 'vi'
      ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
         'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
      : ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'],
    DAYS: locale === 'vi'
      ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  }), [locale]);

  const {
    categories,
    settings,
    updateTransaction,
    deleteTransaction,
  } = useAppStore();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    const txn = await getTransactionById(transactionId);
    if (txn) {
      setTransaction(txn);
      setAmount(formatNumber(txn.amount));
      setCategoryId(txn.categoryId);
      setNote(txn.note);
      setDate(txn.date);

      // Set picker to transaction date
      const d = new Date(txn.date);
      setPickerYear(d.getFullYear());
      setPickerMonth(d.getMonth());
    }
    setLoading(false);
  };

  const handleAmountChange = (text: string) => {
    const value = parseVND(text);
    setAmount(formatNumber(value));
  };

  const handleSave = async () => {
    const amountValue = parseVND(amount);
    if (amountValue <= 0) {
      showAlert(t.common.error, t.transaction.enterAmount);
      return;
    }
    if (!categoryId) {
      showAlert(t.common.error, t.transaction.selectCategory);
      return;
    }

    await updateTransaction(transactionId, {
      amount: amountValue,
      categoryId,
      note,
      date,
    });
    // updateTransaction already calls loadSummary and loadTransactions

    router.back();
  };

  const handleDelete = () => {
    showAlert(
      t.transaction.deleteTransaction,
      t.transaction.confirmDelete,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    await deleteTransaction(transactionId);
    // deleteTransaction already calls loadSummary and loadTransactions
    router.back();
  };

  const openDatePicker = () => {
    const d = new Date(date);
    setPickerYear(d.getFullYear());
    setPickerMonth(d.getMonth());
    setShowDatePicker(true);
  };

  const handleDateSelect = (selectedDate: Date) => {
    // Use toDateString() to avoid timezone bugs (never use toISOString for dates)
    setDate(toDateString(selectedDate));
    setShowDatePicker(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.common.loading}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.transaction.notFound}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  // Filter categories by transaction type (expense or income)
  const filteredCategories = categories.filter(c => !c.archived && c.type === transaction.type);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar days
  const firstDay = new Date(pickerYear, pickerMonth, 1);
  const lastDay = new Date(pickerYear, pickerMonth + 1, 0);
  const startOffset = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(pickerYear, pickerMonth, d));
  }

  const selectedDateObj = new Date(date);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.transaction.editTransaction}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Transaction type indicator (read-only) */}
        <View style={[styles.typeIndicator, transaction.type === 'income' && styles.typeIndicatorIncome]}>
          <Text style={styles.typeIndicatorText}>
            {transaction.type === 'expense' ? t.transaction.expense : t.transaction.income}
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.transaction.amount}</Text>
          <View style={styles.amountCard}>
            <Text style={styles.amountDisplay}>
              {parseVND(amount) > 0 ? formatCurrency(parseVND(amount), settings.currency) : '0 ₫'}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder={t.transaction.enterAmountPlaceholder}
              placeholderTextColor={colors.sub}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.transaction.category}</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  categoryId === cat.id && styles.categoryItemActive,
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <CategoryIcon
                  icon={cat.icon}
                  color={cat.color}
                  size={40}
                />
                <Text
                  style={[
                    styles.categoryName,
                    categoryId === cat.id && styles.categoryNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date - now editable */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.transaction.date}</Text>
          <TouchableOpacity style={styles.dateCard} onPress={openDatePicker}>
            <Text style={styles.dateText}>{formatDate(date, locale)}</Text>
            <Text style={styles.dateArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.transaction.note}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t.transaction.addNotePlaceholder}
            placeholderTextColor={colors.sub}
            multiline
          />
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t.common.saveChanges}</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteBtnBottom} onPress={handleDelete}>
          <Text style={styles.deleteBtnBottomText}>{t.transaction.deleteTransaction}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Year/Month header */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)}>
                <Text style={styles.pickerArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (pickerYear < today.getFullYear()) {
                    setPickerYear(y => y + 1);
                  }
                }}
                disabled={pickerYear >= today.getFullYear()}
              >
                <Text style={[
                  styles.pickerArrow,
                  pickerYear >= today.getFullYear() && styles.pickerArrowDisabled
                ]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month selector */}
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={() => {
                if (pickerMonth === 0) {
                  setPickerYear(y => y - 1);
                  setPickerMonth(11);
                } else {
                  setPickerMonth(m => m - 1);
                }
              }}>
                <Text style={styles.monthArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthName}>{MONTHS[pickerMonth]}</Text>
              <TouchableOpacity
                onPress={() => {
                  const nextMonth = pickerMonth + 1;
                  const nextYear = nextMonth > 11 ? pickerYear + 1 : pickerYear;
                  const canAdvance = nextYear < today.getFullYear() ||
                    (nextYear === today.getFullYear() && (nextMonth % 12) <= today.getMonth());
                  if (canAdvance) {
                    if (nextMonth > 11) {
                      setPickerYear(y => y + 1);
                      setPickerMonth(0);
                    } else {
                      setPickerMonth(m => m + 1);
                    }
                  }
                }}
              >
                <Text style={styles.monthArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map(day => (
                <Text key={day} style={styles.dayHeader}>{day}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {days.map((d, index) => {
                if (!d) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isDisabled = d > today;
                const isSelected = d.getFullYear() === selectedDateObj.getFullYear() &&
                  d.getMonth() === selectedDateObj.getMonth() &&
                  d.getDate() === selectedDateObj.getDate();
                const isTodayDate = d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate();

                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isTodayDate && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => !isDisabled && handleDateSelect(d)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                      isTodayDate && !isSelected && styles.dayTextToday,
                    ]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.closeBtnText}>{t.common.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  // Type indicator (read-only)
  typeIndicator: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeIndicatorIncome: {
    backgroundColor: colors.green,
  },
  typeIndicatorText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  // Section
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
  },
  // Amount
  amountCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  amountDisplay: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  amountInput: {
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    width: '100%',
    textAlign: 'center',
  },
  // Category
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  categoryItemActive: {
    backgroundColor: colors.accent,
  },
  categoryName: {
    fontSize: fontSize.xs,
    color: colors.sub,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#fff',
  },
  // Date
  dateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.text,
  },
  dateArrow: {
    fontSize: 20,
    color: colors.sub,
    fontWeight: '300',
  },
  // Note
  noteInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontSize: fontSize.base,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Save button
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  // Delete button
  deleteBtnBottom: {
    backgroundColor: `${colors.red}15`,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red,
  },
  deleteBtnBottomText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.red,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerArrow: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
    paddingHorizontal: 12,
  },
  pickerArrowDisabled: {
    color: colors.sub,
    opacity: 0.3,
  },
  pickerYear: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthArrow: {
    fontSize: 24,
    color: colors.text,
    paddingHorizontal: 8,
  },
  monthName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dayText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.sub,
    opacity: 0.4,
  },
  dayTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: colors.card2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  // Confirm modal
  confirmModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confirmMessage: {
    fontSize: fontSize.md,
    color: colors.sub,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: colors.card2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});
