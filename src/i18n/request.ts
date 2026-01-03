import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isValidLocale, type Locale } from './config';

/**
 * Load messages for the requested locale.
 * Since we're doing static export without URL-based routing,
 * we'll load the locale from a cookie or default.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !isValidLocale(locale)) {
    locale = defaultLocale;
  }

  // Load all translation namespaces
  const messages = {
    common: (await import(`@/locales/${locale}/common.json`)).default,
    projects: (await import(`@/locales/${locale}/projects.json`)).default,
    characters: (await import(`@/locales/${locale}/characters.json`)).default,
    editions: (await import(`@/locales/${locale}/editions.json`)).default,
    settings: (await import(`@/locales/${locale}/settings.json`)).default,
    sync: (await import(`@/locales/${locale}/sync.json`)).default,
    media: (await import(`@/locales/${locale}/media.json`)).default,
    errors: (await import(`@/locales/${locale}/errors.json`)).default,
    import: (await import(`@/locales/${locale}/import.json`)).default,
  };

  return {
    locale: locale as Locale,
    messages,
  };
});
