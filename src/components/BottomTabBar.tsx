// Bottom tab bar component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, router } from 'expo-router';
import { colors, radius, fontSize, spacing } from './theme';
import { useI18n } from '@/i18n/context';

interface TabItem {
  key: string;
  icon: string;
  labelKey: 'home' | 'stats' | 'add' | 'categories' | 'settings';
  href: string;
}

const tabs: TabItem[] = [
  { key: 'home', icon: '🏠', labelKey: 'home', href: '/' },
  { key: 'stats', icon: '📊', labelKey: 'stats', href: '/stats' },
  { key: 'add', icon: '+', labelKey: 'add', href: '/add' },
  { key: 'categories', icon: '📁', labelKey: 'categories', href: '/categories' },
  { key: 'settings', icon: '⚙️', labelKey: 'settings', href: '/settings' },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const getLabel = (key: TabItem['labelKey']): string => {
    switch (key) {
      case 'home': return t.nav.home;
      case 'stats': return t.nav.stats;
      case 'add': return '';
      case 'categories': return t.category.title;
      case 'settings': return t.settings.title;
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = isActive(tab.href);

        if (tab.key === 'add') {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.addButton}
              onPress={() => router.push(tab.href as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.addIcon}>{tab.icon}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.push(tab.href as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {getLabel(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.sub,
  },
  labelActive: {
    color: colors.accent,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  addIcon: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '400',
  },
});
