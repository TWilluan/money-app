// Period hierarchy configuration
// Follows Open/Closed Principle - extend via config, not modification

import type { Period } from '@/types';

/**
 * Period types that should be included when viewing a specific period
 * - daily: only 'daily'
 * - weekly: 'daily', 'weekly'
 * - monthly: 'daily', 'weekly', 'monthly'
 * - annually: 'daily', 'weekly', 'monthly', 'annually'
 */
export const PERIOD_HIERARCHY: Record<Period, Period[]> = {
  daily: ['daily'],
  weekly: ['daily', 'weekly'],
  monthly: ['daily', 'weekly', 'monthly'],
  annually: ['daily', 'weekly', 'monthly', 'annually'],
};

/**
 * Period ordering from smallest to largest
 */
export const PERIOD_ORDER: Period[] = ['daily', 'weekly', 'monthly', 'annually'];

/**
 * Direct parent period for each period type
 */
export const DIRECT_PARENT: Record<Period, Period | null> = {
  daily: 'weekly',
  weekly: 'monthly',
  monthly: 'annually',
  annually: null,
};

/**
 * Direct child period for each period type
 */
export const DIRECT_CHILD: Record<Period, Period | null> = {
  annually: 'monthly',
  monthly: 'weekly',
  weekly: 'daily',
  daily: null,
};

/**
 * Human-readable Vietnamese labels for periods
 */
export const PERIOD_LABELS: Record<Period, string> = {
  daily: 'ngày',
  weekly: 'tuần',
  monthly: 'tháng',
  annually: 'năm',
};

/**
 * Get included period types for viewing (replaces switch statement)
 */
export function getIncludedPeriodTypes(viewingPeriod: Period): Period[] {
  return PERIOD_HIERARCHY[viewingPeriod];
}

/**
 * Get direct parent period type
 */
export function getDirectParentPeriodType(childPeriodType: Period): Period | null {
  return DIRECT_PARENT[childPeriodType];
}

/**
 * Get direct child period type
 */
export function getDirectChildPeriodType(parentPeriodType: Period): Period | null {
  return DIRECT_CHILD[parentPeriodType];
}

/**
 * Get all ancestor periods (parents and their parents)
 */
export function getAncestorPeriods(period: Period): Period[] {
  const ancestors: Period[] = [];
  let current: Period | null = DIRECT_PARENT[period];

  while (current !== null) {
    ancestors.push(current);
    current = DIRECT_PARENT[current];
  }

  return ancestors;
}

/**
 * Get all descendant periods (children and their children)
 */
export function getDescendantPeriods(period: Period): Period[] {
  const descendants: Period[] = [];
  let current: Period | null = DIRECT_CHILD[period];

  while (current !== null) {
    descendants.push(current);
    current = DIRECT_CHILD[current];
  }

  return descendants;
}
