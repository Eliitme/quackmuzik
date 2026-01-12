import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

type Locale = 'vi' | 'en';
type TranslationKey = string;
type Translations = Record<string, any>;

const translations: Record<Locale, Translations> = {
  vi: {},
  en: {},
};

// Load translations
try {
  // Support both dev (src) and production (dist) paths
  // In dev: __dirname = src/utils, so ../locales = src/locales
  // In prod: __dirname = dist/utils, so ../../src/locales = src/locales (if copied) or ../locales = dist/locales
  let basePath = join(__dirname, '../locales');

  // Try to load from dist/locales first (production), fallback to src/locales (dev)
  try {
    readFileSync(join(basePath, 'vi.json'), 'utf-8');
  } catch {
    // If not found, try src/locales (for dev mode)
    basePath = join(__dirname, '../../src/locales');
  }

  const viPath = join(basePath, 'vi.json');
  const enPath = join(basePath, 'en.json');

  translations.vi = JSON.parse(readFileSync(viPath, 'utf-8'));
  translations.en = JSON.parse(readFileSync(enPath, 'utf-8'));

  logger.info('Translations loaded', { locales: ['vi', 'en'], basePath });
} catch (error) {
  logger.error('Failed to load translations', { error, __dirname });
}

/**
 * Get translation for a key
 */
function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations[locale] || translations.vi;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to Vietnamese if key not found
      value = translations.vi;
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    logger.warn('Translation value is not a string', { key, locale, value });
    return key;
  }

  // Replace placeholders
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  return value;
}

/**
 * Get translation with default locale fallback
 */
export function translate(
  locale: Locale | null,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const defaultLocale: Locale = 'vi';
  const targetLocale = locale || defaultLocale;

  return t(targetLocale, key, params);
}

/**
 * Get all translations for a namespace (e.g., 'commands.help')
 */
export function getTranslations(locale: Locale | null, namespace: string): Translations {
  const defaultLocale: Locale = 'vi';
  const targetLocale = locale || defaultLocale;

  const keys = namespace.split('.');
  let value: any = translations[targetLocale] || translations[defaultLocale];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback
      value = translations[defaultLocale];
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
      }
      break;
    }
  }

  return value || {};
}

export type { Locale };
