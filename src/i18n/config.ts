/**
 * i18n Configuration
 * 
 * Defines supported locales and default language settings.
 */

export const locales = ['en', 'pt-BR'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'pt-BR': 'Português (Brasil)',
};

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'pt-BR': '🇧🇷',
};

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
