// Settings screen

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, BottomTabBar, showAlert } from '@/components';
import { useI18n } from '@/i18n/context';

const CURRENCY_FLAGS: Record<string, string> = {
  VND: '🇻🇳',
  USD: '🇺🇸',
  CNY: '🇨🇳',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  VND: '₫',
  USD: '$',
  CNY: '¥',
};

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppStore();
  const { t, languageNames, language } = useI18n();

  const handleExport = () => {
    showAlert(t.settings.export, t.settings.featureInDev);
  };

  const handleImport = () => {
    showAlert(t.settings.import, t.settings.featureInDev);
  };

  const lastExportDays = settings.lastExportAt
    ? Math.floor(
        (Date.now() - new Date(settings.lastExportAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.settings.title}</Text>

        {/* Backup reminder banner */}
        <TouchableOpacity style={styles.banner} onPress={handleExport}>
          <Text style={styles.bannerIcon}>💾</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{t.settings.backup}</Text>
            <Text style={styles.bannerSubtitle}>
              {lastExportDays !== null
                ? `${lastExportDays} ${t.period.day}`
                : t.settings.notBackedUp}
            </Text>
          </View>
          <Text style={styles.bannerChevron}>›</Text>
        </TouchableOpacity>

        {/* General settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.settings.general.toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="💱"
              label={t.settings.currency}
              value={`${CURRENCY_FLAGS[settings.currency] ?? '💰'} ${settings.currency} ${CURRENCY_SYMBOLS[settings.currency] ?? ''}`}
              onPress={() => router.push('/settings/currency')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🌐"
              label={t.settings.language}
              value={languageNames[language]}
              onPress={() => router.push('/settings/language')}
            />
          </View>
        </View>

        {/* Data settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === 'zh' ? '数据' : language === 'en' ? 'DATA' : 'DỮ LIỆU'}</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="📤"
              label={t.settings.export}
              onPress={handleExport}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="📥"
              label={t.settings.import}
              onPress={handleImport}
            />
          </View>
        </View>

        {/* Other settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.common.other.toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="ℹ️"
              label={t.settings.about}
              value="v1.0"
            />
          </View>
        </View>

        {/* Storage note */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            {language === 'zh' ? '数据存储在本地设备上' : language === 'en' ? 'Data stored locally on this device' : 'Dữ liệu lưu cục bộ trên thiết bị này'}
          </Text>
          <Text style={styles.noteSubtext}>
            {language === 'zh' ? '无账户 · 不同步' : language === 'en' ? 'No account · No sync' : 'Không có tài khoản · Không đồng bộ'}
          </Text>
        </View>
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  subtitle?: string;
  valueColor?: string;
  onPress?: () => void;
}

function SettingRow({ icon, label, value, subtitle, valueColor, onPress }: SettingRowProps) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>
            {value}
          </Text>
        )}
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.text,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${colors.green}24`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.green}66`,
    padding: spacing.lg,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  bannerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  bannerChevron: {
    fontSize: 20,
    color: colors.green,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowIcon: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.sub,
  },
  rowChevron: {
    fontSize: 18,
    color: colors.sub,
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },
  note: {
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.md,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  noteSubtext: {
    fontSize: fontSize.xs,
    color: colors.sub,
    opacity: 0.7,
  },
});
