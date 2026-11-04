// Date/Period Picker Modal component

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, spacing, radius, fontSize } from './theme';
import { useI18n } from '@/i18n/context';
import type { Period } from '@/types';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate: Date;
  periodType: Period;
  weekStart: 'mon' | 'sun';
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  selectedDate,
  periodType,
  weekStart,
}: DatePickerModalProps) {
  const { t } = useI18n();
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  // Locale-aware month names
  const MONTHS = useMemo(() => [
    t.months.jan, t.months.feb, t.months.mar, t.months.apr,
    t.months.may, t.months.jun, t.months.jul, t.months.aug,
    t.months.sep, t.months.oct, t.months.nov, t.months.dec,
  ], [t]);

  // Locale-aware weekday names
  const WEEKDAYS_MON = useMemo(() => [
    t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat, t.days.sun
  ], [t]);
  const WEEKDAYS_SUN = useMemo(() => [
    t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat
  ], [t]);

  const weekdays = weekStart === 'mon' ? WEEKDAYS_MON : WEEKDAYS_SUN;

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get day of week for first day (0 = Sun, 1 = Mon, ...)
    let startOffset = firstDay.getDay();
    if (weekStart === 'mon') {
      startOffset = startOffset === 0 ? 6 : startOffset - 1;
    }

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [viewDate, weekStart]);

  // Generate years for year picker
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result: number[] = [];
    for (let y = currentYear - 10; y <= currentYear + 5; y++) {
      result.push(y);
    }
    return result;
  }, []);

  // Generate weeks for week picker
  const weeks = useMemo(() => {
    const year = viewDate.getFullYear();
    const result: { weekNum: number; startDate: Date; endDate: Date }[] = [];

    // Get first day of year
    const jan1 = new Date(year, 0, 1);
    let currentDate = new Date(jan1);

    // Adjust to first day of first week
    const dayOfWeek = currentDate.getDay();
    const offset = weekStart === 'mon'
      ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
      : -dayOfWeek;
    currentDate.setDate(currentDate.getDate() + offset);

    let weekNum = 1;
    while (currentDate.getFullYear() <= year || weekNum <= 52) {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 6);

      // Only include weeks that have days in this year
      if (startDate.getFullYear() === year || endDate.getFullYear() === year) {
        result.push({ weekNum, startDate, endDate });
      }

      currentDate.setDate(currentDate.getDate() + 7);
      weekNum++;

      if (weekNum > 53) break;
    }

    return result;
  }, [viewDate, weekStart]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handlePrevYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
  };

  const handleNextYear = () => {
    setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
  };

  const handleSelectDay = (date: Date) => {
    onSelect(date);
    onClose();
  };

  const handleSelectMonth = (monthIndex: number) => {
    onSelect(new Date(viewDate.getFullYear(), monthIndex, 1));
    onClose();
  };

  const handleSelectYear = (year: number) => {
    onSelect(new Date(year, 0, 1));
    onClose();
  };

  const handleSelectWeek = (startDate: Date) => {
    onSelect(startDate);
    onClose();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const formatShortDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modal}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {periodType === 'daily' && t.datePicker.selectDate}
              {periodType === 'weekly' && t.datePicker.selectWeek}
              {periodType === 'monthly' && t.datePicker.selectMonth}
              {periodType === 'annually' && t.datePicker.selectYear}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Daily: Calendar */}
          {periodType === 'daily' && (
            <>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePrevMonth}>
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={handleNextMonth}>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.weekdaysRow}>
                {weekdays.map((day, idx) => (
                  <Text key={idx} style={styles.weekdayLabel}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      date && isToday(date) && styles.dayCellToday,
                      date && isSelected(date) && styles.dayCellSelected,
                    ]}
                    onPress={() => date && handleSelectDay(date)}
                    disabled={!date}
                  >
                    {date && (
                      <Text style={[
                        styles.dayText,
                        isToday(date) && styles.dayTextToday,
                        isSelected(date) && styles.dayTextSelected,
                      ]}>
                        {date.getDate()}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Weekly: Week list */}
          {periodType === 'weekly' && (
            <>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePrevYear}>
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{viewDate.getFullYear()}</Text>
                <TouchableOpacity onPress={handleNextYear}>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                {weeks.map((week) => {
                  const isWeekSelected =
                    selectedDate >= week.startDate &&
                    selectedDate <= week.endDate;

                  return (
                    <TouchableOpacity
                      key={week.weekNum}
                      style={[
                        styles.listItem,
                        isWeekSelected && styles.listItemSelected,
                      ]}
                      onPress={() => handleSelectWeek(week.startDate)}
                    >
                      <Text style={[
                        styles.listItemText,
                        isWeekSelected && styles.listItemTextSelected,
                      ]}>
                        {t.datePicker.week} {week.weekNum}
                      </Text>
                      <Text style={[
                        styles.listItemSub,
                        isWeekSelected && styles.listItemSubSelected,
                      ]}>
                        {formatShortDate(week.startDate)} - {formatShortDate(week.endDate)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Monthly: Month grid */}
          {periodType === 'monthly' && (
            <>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePrevYear}>
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{viewDate.getFullYear()}</Text>
                <TouchableOpacity onPress={handleNextYear}>
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {MONTHS.map((month, index) => {
                  const isMonthSelected =
                    selectedDate.getMonth() === index &&
                    selectedDate.getFullYear() === viewDate.getFullYear();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthCell,
                        isMonthSelected && styles.monthCellSelected,
                      ]}
                      onPress={() => handleSelectMonth(index)}
                    >
                      <Text style={[
                        styles.monthCellText,
                        isMonthSelected && styles.monthCellTextSelected,
                      ]}>
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Annually: Year list */}
          {periodType === 'annually' && (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {years.map((year) => {
                const isYearSelected = selectedDate.getFullYear() === year;

                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.listItem,
                      isYearSelected && styles.listItemSelected,
                    ]}
                    onPress={() => handleSelectYear(year)}
                  >
                    <Text style={[
                      styles.listItemText,
                      isYearSelected && styles.listItemTextSelected,
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Today button for daily */}
          {periodType === 'daily' && (
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => handleSelectDay(new Date())}
            >
              <Text style={styles.todayBtnText}>{t.datePicker.today}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    fontSize: 20,
    color: colors.sub,
    padding: spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navArrow: {
    fontSize: 28,
    color: colors.accent,
    paddingHorizontal: spacing.md,
  },
  monthLabel: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dayCellToday: {
    backgroundColor: colors.card2,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  dayTextToday: {
    color: colors.accent,
  },
  dayTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthCell: {
    width: `${(100 - 4) / 3}%`,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  monthCellSelected: {
    backgroundColor: colors.accent,
  },
  monthCellText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  monthCellTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  listScroll: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  listItemSelected: {
    backgroundColor: colors.accent,
  },
  listItemText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  listItemTextSelected: {
    color: colors.text,
  },
  listItemSub: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  listItemSubSelected: {
    color: colors.text,
    opacity: 0.8,
  },
  todayBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.md,
  },
  todayBtnText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.accent,
  },
});
