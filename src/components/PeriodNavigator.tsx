// Period navigator with calendar picker

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors, spacing, radius, fontSize } from './theme';
import type { Period } from '../types';
import { useI18n } from '@/i18n/context';

interface PeriodNavigatorProps {
  period: Period;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function PeriodNavigator({ period, currentDate, onDateChange }: PeriodNavigatorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const { t, language } = useI18n();

  // Localized month names
  const MONTHS = useMemo(() => [
    t.months.jan, t.months.feb, t.months.mar, t.months.apr,
    t.months.may, t.months.jun, t.months.jul, t.months.aug,
    t.months.sep, t.months.oct, t.months.nov, t.months.dec
  ], [t]);

  // Localized day abbreviations
  const DAYS = useMemo(() => [
    t.days.sun, t.days.mon, t.days.tue, t.days.wed,
    t.days.thu, t.days.fri, t.days.sat
  ], [t]);

  const isToday = useMemo(() => {
    const today = new Date();
    return isSamePeriod(currentDate, today, period);
  }, [currentDate, period]);

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    switch (period) {
      case 'daily':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'monthly':
        // Set to 1st to avoid overflow when changing months
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'annually':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    const today = new Date();

    switch (period) {
      case 'daily':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'monthly':
        // Set to 1st to avoid overflow when changing months
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'annually':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }

    // Don't go beyond today
    if (newDate <= today || isSamePeriod(newDate, today, period)) {
      onDateChange(newDate);
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const openPicker = () => {
    setPickerYear(currentDate.getFullYear());
    setPickerMonth(currentDate.getMonth());
    setShowPicker(true);
  };

  const handlePickerSelect = (date: Date) => {
    const today = new Date();
    if (date <= today) {
      onDateChange(date);
    }
    setShowPicker(false);
  };

  const canGoNext = useMemo(() => {
    const today = new Date();
    return !isSamePeriod(currentDate, today, period);
  }, [currentDate, period]);

  // Get label for "current" button - shows TODAY's date/period
  const currentLabel = useMemo(() => {
    switch (period) {
      case 'daily': return t.period.today;
      case 'weekly': return t.period.thisWeek;
      case 'monthly': return t.period.thisMonth;
      case 'annually': return t.period.thisYear;
    }
  }, [period, t]);

  // Format period display with i18n
  const formatDisplay = (date: Date, p: Period): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    switch (p) {
      case 'daily':
        return `${day}/${month}/${year}`;
      case 'weekly': {
        const weekStart = new Date(date);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
      }
      case 'monthly':
        return `${MONTHS[date.getMonth()]} ${year}`;
      case 'annually':
        return `${year}`;
    }
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity onPress={navigatePrev} style={styles.arrowBtn}>
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.centerSection}>
          <TouchableOpacity onPress={openPicker} style={styles.dateBtn}>
            <Text style={styles.dateText}>{formatDisplay(currentDate, period)}</Text>
          </TouchableOpacity>

          {isToday && (
            <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
              <Text style={styles.todayText}>{currentLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={navigateNext}
          style={[styles.arrowBtn, !canGoNext && styles.arrowDisabled]}
          disabled={!canGoNext}
        >
          <Text style={[styles.arrow, !canGoNext && styles.arrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)}>
                <Text style={styles.pickerArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (pickerYear < new Date().getFullYear()) {
                    setPickerYear(y => y + 1);
                  }
                }}
                disabled={pickerYear >= new Date().getFullYear()}
              >
                <Text style={[
                  styles.pickerArrow,
                  pickerYear >= new Date().getFullYear() && styles.arrowTextDisabled
                ]}>›</Text>
              </TouchableOpacity>
            </View>

            {period === 'annually' ? (
              <YearPicker
                selectedYear={pickerYear}
                onSelect={(year) => handlePickerSelect(new Date(year, 0, 1))}
              />
            ) : period === 'monthly' ? (
              <MonthPicker
                year={pickerYear}
                months={MONTHS}
                selectedMonth={currentDate.getFullYear() === pickerYear ? currentDate.getMonth() : -1}
                onSelect={(month) => handlePickerSelect(new Date(pickerYear, month, 1))}
              />
            ) : (
              <View>
                {/* Month selector for daily/weekly */}
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
                      const today = new Date();
                      const nextMonth = pickerMonth + 1;
                      const nextYear = nextMonth > 11 ? pickerYear + 1 : pickerYear;
                      if (nextYear < today.getFullYear() || (nextYear === today.getFullYear() && (nextMonth % 12) <= today.getMonth())) {
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
                <CalendarGrid
                  year={pickerYear}
                  month={pickerMonth}
                  selectedDate={currentDate}
                  period={period}
                  days={DAYS}
                  onSelect={handlePickerSelect}
                />
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.closeBtnText}>{t.common.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Year picker for annually period
function YearPicker({ selectedYear, onSelect }: { selectedYear: number; onSelect: (year: number) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <View style={styles.yearGrid}>
      {years.map(year => (
        <TouchableOpacity
          key={year}
          style={[styles.yearItem, year === selectedYear && styles.yearSelected]}
          onPress={() => onSelect(year)}
        >
          <Text style={[styles.yearText, year === selectedYear && styles.yearTextSelected]}>
            {year}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Month picker for monthly period
function MonthPicker({ year, months, selectedMonth, onSelect }: {
  year: number;
  months: string[];
  selectedMonth: number;
  onSelect: (month: number) => void;
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  return (
    <View style={styles.monthGrid}>
      {months.map((name, index) => {
        const isDisabled = year > currentYear || (year === currentYear && index > currentMonth);
        const isSelected = index === selectedMonth;
        // Get short month name (first 3 chars or up to space)
        const shortName = name.length <= 3 ? name : name.split(' ')[0].substring(0, 3);

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.monthItem,
              isSelected && styles.monthSelected,
              isDisabled && styles.monthDisabled,
            ]}
            onPress={() => !isDisabled && onSelect(index)}
            disabled={isDisabled}
          >
            <Text style={[
              styles.monthText,
              isSelected && styles.monthTextSelected,
              isDisabled && styles.monthTextDisabled,
            ]}>
              {shortName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Calendar grid for daily/weekly
function CalendarGrid({ year, month, selectedDate, period, days, onSelect }: {
  year: number;
  month: number;
  selectedDate: Date;
  period: Period;
  days: string[];
  onSelect: (date: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0 = Sunday

  const calendarDays: (Date | null)[] = [];

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }

  // Days of month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    calendarDays.push(new Date(year, month, d));
  }

  return (
    <View>
      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {days.map(day => (
          <Text key={day} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isDisabled = date > today;
          const isSelected = period === 'daily'
            ? isSameDay(date, selectedDate)
            : isSameWeek(date, selectedDate);
          const isToday = isSameDay(date, today);

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && styles.dayCellToday,
              ]}
              onPress={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
            >
              <Text style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
                isDisabled && styles.dayTextDisabled,
                isToday && !isSelected && styles.dayTextToday,
              ]}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Helpers
function isSamePeriod(d1: Date, d2: Date, period: Period): boolean {
  switch (period) {
    case 'daily':
      return isSameDay(d1, d2);
    case 'weekly':
      return isSameWeek(d1, d2);
    case 'monthly':
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    case 'annually':
      return d1.getFullYear() === d2.getFullYear();
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isSameWeek(d1: Date, d2: Date): boolean {
  const getWeekStart = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  return getWeekStart(d1) === getWeekStart(d2);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '300',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowTextDisabled: {
    color: colors.sub,
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  todayBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  todayText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: spacing.lg,
  },
  pickerArrow: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
    paddingHorizontal: 12,
  },
  pickerYear: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  // Month selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  // Year grid
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  yearItem: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.card2,
  },
  yearSelected: {
    backgroundColor: colors.accent,
  },
  yearText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  yearTextSelected: {
    color: '#fff',
  },
  // Month grid
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  monthItem: {
    width: '23%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.card2,
  },
  monthSelected: {
    backgroundColor: colors.accent,
  },
  monthDisabled: {
    opacity: 0.3,
  },
  monthText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  monthTextSelected: {
    color: '#fff',
  },
  monthTextDisabled: {
    color: colors.sub,
  },
  // Calendar
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
    borderRadius: radius.full,
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
});
