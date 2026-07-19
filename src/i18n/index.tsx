/**
 * i18n wiring: react-i18next + AsyncStorage persistence.
 *
 * The language also drives font selection (Tamil and Hindi render in their own
 * faces), so `useLanguage()` exposes the resolved script alongside the code.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, resources, STRINGS, type LanguageCode, type Strings } from './strings';
import { scriptFor } from '../theme/fonts';
import type { Script } from '../theme/tokens';

const STORAGE_KEY = 'spiceroute.language';

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  // React Native has no <Suspense> boundary around the tree by default.
  react: { useSuspense: false },
});

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  script: Script;
  /** The full string table for the active language. */
  t: Strings;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  // Restore the persisted choice on boot.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (cancelled || !saved) return;
      if (saved === 'en' || saved === 'ta' || saved === 'hi') {
        setLanguageState(saved);
        void i18n.changeLanguage(saved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    void i18n.changeLanguage(code);
    void AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, script: scriptFor(language), t: STRINGS[language] }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

export { useTranslation, i18n };
export * from './strings';
