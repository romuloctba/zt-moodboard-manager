'use client';

import { useSyncExternalStore } from 'react';
import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { useLocaleStore } from '@/store/localeStore';
import { defaultLocale, type Locale } from '@/i18n/config';

// Import all locales statically for client-side bundling
import enCommon from '@/locales/en/common.json';
import enProjects from '@/locales/en/projects.json';
import enCharacters from '@/locales/en/characters.json';
import enSettings from '@/locales/en/settings.json';
import enSync from '@/locales/en/sync.json';
import enMedia from '@/locales/en/media.json';
import enErrors from '@/locales/en/errors.json';
import enEditions from '@/locales/en/editions.json';
import enImport from '@/locales/en/import.json';
import enHelp from '@/locales/en/help.json';

import ptBRCommon from '@/locales/pt-BR/common.json';
import ptBRProjects from '@/locales/pt-BR/projects.json';
import ptBRCharacters from '@/locales/pt-BR/characters.json';
import ptBRSettings from '@/locales/pt-BR/settings.json';
import ptBRSync from '@/locales/pt-BR/sync.json';
import ptBRMedia from '@/locales/pt-BR/media.json';
import ptBRErrors from '@/locales/pt-BR/errors.json';
import ptBREditions from '@/locales/pt-BR/editions.json';
import ptBRImport from '@/locales/pt-BR/import.json';
import ptBRHelp from '@/locales/pt-BR/help.json';

const messages: Record<Locale, AbstractIntlMessages> = {
  en: {
    common: enCommon,
    projects: enProjects,
    characters: enCharacters,
    settings: enSettings,
    sync: enSync,
    media: enMedia,
    errors: enErrors,
    editions: enEditions,
    import: enImport,
    help: enHelp,
  },
  'pt-BR': {
    common: ptBRCommon,
    projects: ptBRProjects,
    characters: ptBRCharacters,
    settings: ptBRSettings,
    sync: ptBRSync,
    media: ptBRMedia,
    errors: ptBRErrors,
    editions: ptBREditions,
    import: ptBRImport,
    help: ptBRHelp,
  },
};

interface LocaleProviderProps {
  children: React.ReactNode;
}

// Helper to check if we're on the client
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function LocaleProvider({ children }: LocaleProviderProps) {
  const { locale, isHydrated } = useLocaleStore();
  
  // Use useSyncExternalStore to safely detect client-side rendering
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  // Use default locale until hydrated to avoid hydration mismatch
  const activeLocale = isClient && isHydrated ? locale : defaultLocale;
  const activeMessages = messages[activeLocale];

  return (
    <NextIntlClientProvider 
      locale={activeLocale} 
      messages={activeMessages}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
