import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isHydrated: boolean;
  setHydrated: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      isHydrated: false,
      setLocale: (locale: Locale) => {
        if (isValidLocale(locale)) {
          set({ locale });
          // Update HTML lang attribute
          if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
          }
        }
      },
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'locale-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        // Update HTML lang attribute on rehydration
        if (state && typeof document !== 'undefined') {
          document.documentElement.lang = state.locale;
        }
      },
    }
  )
);
