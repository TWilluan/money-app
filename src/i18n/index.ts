// i18n system for Money Manager
import { vi, type Translations } from './vi';
import { en } from './en';
import { zh } from './zh';

export type Language = 'vi' | 'en' | 'zh';

export const translations: Record<Language, Translations> = {
  vi,
  en,
  zh,
};

export const languageNames: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
};

export const languageFlags: Record<Language, string> = {
  vi: '🇻🇳',
  en: '🇺🇸',
  zh: '🇨🇳',
};

// Default language
let currentLanguage: Language = 'vi';

// Get current translations
export function t(): Translations {
  return translations[currentLanguage];
}

// Get translation by path (e.g., 'common.save')
export function tt(path: string): string {
  const keys = path.split('.');
  let result: any = translations[currentLanguage];

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      console.warn(`Translation not found: ${path}`);
      return path;
    }
  }

  return typeof result === 'string' ? result : path;
}

// Set language
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

// Get current language
export function getLanguage(): Language {
  return currentLanguage;
}

// Format string with placeholders (e.g., 'Hello {name}' -> 'Hello John')
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export type { Translations };
export { vi, en, zh };
