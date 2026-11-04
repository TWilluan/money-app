// i18n React context and hook
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, languageNames, languageFlags, type Language, type Translations } from './index';
import { useAppStore } from '@/store';

interface I18nContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  format: (template: string, values: Record<string, string | number>) => string;
  languageNames: typeof languageNames;
  languageFlags: typeof languageFlags;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { settings, updateSettings } = useAppStore();
  const [language, setLanguageState] = useState<Language>(settings.language || 'vi');

  // Sync with store settings
  useEffect(() => {
    if (settings.language && settings.language !== language) {
      setLanguageState(settings.language);
    }
  }, [settings.language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await updateSettings({ language: lang });
  }, [updateSettings]);

  const format = useCallback((template: string, values: Record<string, string | number>) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
  }, []);

  const value: I18nContextValue = {
    language,
    t: translations[language],
    setLanguage,
    format,
    languageNames,
    languageFlags,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Simple hook that just returns translations for current language
export function useTranslations(): Translations {
  const { t } = useI18n();
  return t;
}
