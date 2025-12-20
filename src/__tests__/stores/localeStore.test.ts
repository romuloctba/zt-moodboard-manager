/**
 * LocaleStore Unit Tests
 *
 * Tests the locale store for internationalization management.
 * This is a minimal store (~40 lines) using zustand persist middleware.
 *
 * Note: DOM side effects (document.documentElement.lang) are best tested in E2E.
 * Integration tests for full locale switching in UI provide more value than
 * extensive unit tests here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocaleStore } from '@/store/localeStore';
import { defaultLocale } from '@/i18n/config';

// Helper to reset store between tests
function resetStore() {
  useLocaleStore.setState({
    locale: defaultLocale,
    isHydrated: false,
  });
}

describe('LocaleStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('LS-001: should initialize with defaultLocale and isHydrated=false', () => {
      resetStore();
      const state = useLocaleStore.getState();

      expect(state.locale).toBe('en');
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('setLocale', () => {
    it('LS-002: should update locale state for valid locales', () => {
      const { setLocale } = useLocaleStore.getState();

      // Test changing to pt-BR
      setLocale('pt-BR');
      expect(useLocaleStore.getState().locale).toBe('pt-BR');

      // Test changing back to en
      setLocale('en');
      expect(useLocaleStore.getState().locale).toBe('en');
    });

    it('LS-003: should NOT update locale state for invalid locales', () => {
      const { setLocale } = useLocaleStore.getState();

      // Set to valid locale first
      setLocale('pt-BR');
      expect(useLocaleStore.getState().locale).toBe('pt-BR');

      // Attempt to set invalid locales - should be ignored
      // @ts-expect-error - Testing invalid input
      setLocale('fr');
      expect(useLocaleStore.getState().locale).toBe('pt-BR');

      // @ts-expect-error - Testing invalid input
      setLocale('invalid-locale');
      expect(useLocaleStore.getState().locale).toBe('pt-BR');

      // @ts-expect-error - Testing invalid input
      setLocale('');
      expect(useLocaleStore.getState().locale).toBe('pt-BR');
    });

    it('LS-004: should update document.documentElement.lang when document exists', () => {
      // Mock document
      const originalLang = document.documentElement.lang;

      const { setLocale } = useLocaleStore.getState();
      setLocale('pt-BR');

      expect(document.documentElement.lang).toBe('pt-BR');

      setLocale('en');
      expect(document.documentElement.lang).toBe('en');

      // Restore original
      document.documentElement.lang = originalLang;
    });
  });

  describe('setHydrated', () => {
    it('LS-005: should set isHydrated to true', () => {
      expect(useLocaleStore.getState().isHydrated).toBe(false);

      useLocaleStore.getState().setHydrated();

      expect(useLocaleStore.getState().isHydrated).toBe(true);
    });
  });

  describe('Persist Middleware', () => {
    it('LS-006: should use locale-storage as persist key', () => {
      // The persist middleware configuration uses 'locale-storage' as the name
      // We can verify this by checking the store's persist API
      const persistApi = useLocaleStore.persist;

      expect(persistApi.getOptions().name).toBe('locale-storage');
    });
  });
});
