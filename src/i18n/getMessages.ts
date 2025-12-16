/**
 * i18n Message Loader for Non-React Contexts
 * 
 * Provides a way to load translation messages outside of React components.
 * Used in services, utilities, and other non-component code.
 */

import { defaultLocale, type Locale } from './config';
import { useLocaleStore } from '@/store/localeStore';

// Import all locales for both languages
import enSync from '@/locales/en/sync.json';
import ptBRSync from '@/locales/pt-BR/sync.json';

const messages = {
  en: {
    sync: enSync,
  },
  'pt-BR': {
    sync: ptBRSync,
  },
} as const;

/**
 * Get the current locale from the store
 * Falls back to default locale if store is not available
 */
function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  try {
    const state = useLocaleStore.getState();
    return state.locale || defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/**
 * Get a translated message by key path
 * 
 * @param namespace - The translation namespace (e.g., 'sync')
 * @param keyPath - Dot-separated path to the message (e.g., 'errors.notConnected')
 * @returns The translated message or the key if not found
 */
export function getMessage(namespace: 'sync', keyPath: string): string {
  const locale = getCurrentLocale();
  const keys = keyPath.split('.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = messages[locale][namespace];

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`[i18n] Translation not found: ${namespace}.${keyPath} for locale ${locale}`);
      return keyPath;
    }
  }

  return typeof current === 'string' ? current : keyPath;
}

/**
 * Get sync error messages
 */
export const getSyncMessage = (key: string) => getMessage('sync', key);
