/**
 * Font loading + script resolution.
 *
 * The CSS token stacks (`--font-display`, `--font-body`) rely on the browser
 * falling through to a Tamil/Devanagari face per glyph. React Native has no
 * such fallback, so we load every face up front and pick the family that
 * matches the active language.
 */
import {
  useFonts as useExpoFonts,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  BalooThambi2_500Medium,
  BalooThambi2_600SemiBold,
  BalooThambi2_700Bold,
  BalooThambi2_800ExtraBold,
} from '@expo-google-fonts/baloo-thambi-2';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Mukta_400Regular, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { MuktaMalar_400Regular, MuktaMalar_600SemiBold, MuktaMalar_700Bold } from '@expo-google-fonts/mukta-malar';

import type { Script } from './tokens';
import type { LanguageCode } from '../i18n/strings';

export function useFonts(): [boolean, Error | null] {
  return useExpoFonts({
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    BalooThambi2_500Medium,
    BalooThambi2_600SemiBold,
    BalooThambi2_700Bold,
    BalooThambi2_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Mukta_400Regular,
    Mukta_600SemiBold,
    Mukta_700Bold,
    MuktaMalar_400Regular,
    MuktaMalar_600SemiBold,
    MuktaMalar_700Bold,
  });
}

/** Which font script a UI language renders in. */
export function scriptFor(language: LanguageCode): Script {
  switch (language) {
    case 'ta':
      return 'tamil';
    case 'hi':
      return 'devanagari';
    default:
      return 'latin';
  }
}
