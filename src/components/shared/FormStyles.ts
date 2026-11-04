// Shared form styles used across multiple screens
// Centralizes common patterns to avoid duplication

import { StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

// Layout constants
export const HEADER_PADDING_TOP = 60;
export const TAB_BAR_OVERLAP = -30;
export const ICON_BUTTON_SIZE = 40;

export const formStyles = StyleSheet.create({
  // Container patterns
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  // Header pattern
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
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
  titleLarge: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: ICON_BUTTON_SIZE,
  },

  // Type toggle (expense/income)
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

  // Field groups
  fieldGroup: {
    gap: spacing.md,
  },
  fieldGroupSmall: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.sub,
  },

  // Input styles
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },

  // Save button
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

  // Section styles
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.sub,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },

  // Info banner
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

  // Empty state
  empty: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.sub,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.sub,
    opacity: 0.7,
  },
});

// Period toggle specific styles
export const periodToggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  btnActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  labelActive: {
    color: colors.text,
  },
});

// Card styles for list items
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowMiddle: {
    flex: 1,
    gap: 3,
  },
  chevron: {
    fontSize: 20,
    color: colors.sub,
  },
});
