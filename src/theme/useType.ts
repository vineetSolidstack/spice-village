/**
 * Script-aware type helpers.
 *
 * Components should use these rather than `display()` / `body()` directly, so
 * that Tamil and Hindi automatically render in Baloo Thambi 2 / Mukta instead
 * of the Latin faces.
 */
import { useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { useLanguage } from '../i18n';
import { body, display, type BodyWeight, type DisplayWeight, type Script } from './tokens';

export type TypeHelpers = {
  script: Script;
  display: (size: number, weight?: DisplayWeight) => TextStyle;
  body: (size?: number, weight?: BodyWeight) => TextStyle;
};

export function useType(): TypeHelpers {
  const { script } = useLanguage();
  return useMemo<TypeHelpers>(
    () => ({
      script,
      display: (size, weight = 700) => display(size, weight, script),
      body: (size, weight = 400) => body(size, weight, script),
    }),
    [script],
  );
}
