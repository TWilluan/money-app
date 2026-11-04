// Language settings screen

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, radius, fontSize } from '@/components';
import { useI18n } from '@/i18n/context';
import type { Language } from '@/types';

const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

export default function LanguageSettingsScreen() {
  const { language, setLanguage, t } = useI18n();

  const safeGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length <= 1) {
      router.replace('/settings');
    } else {
      router.back();
    }
  };

  const handleSelectLanguage = async (lang: Language) => {
    await setLanguage(lang);
    // Stay on page to see the change take effect
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={safeGoBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {t.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.language.title}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.languageCard}>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.code}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.languageRow}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.nativeName}>{lang.nativeName}</Text>
                  <Text style={styles.englishName}>{lang.name}</Text>
                </View>
                {language === lang.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: fontSize.base,
    color: colors.green,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  languageCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  flag: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  nativeName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  englishName: {
    fontSize: fontSize.sm,
    color: colors.sub,
    marginTop: 2,
  },
  checkmark: {
    fontSize: fontSize.xl,
    color: colors.green,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },
});
