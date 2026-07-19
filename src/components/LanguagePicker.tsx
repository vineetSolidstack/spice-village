/**
 * Language selection list — port of `components/i18n/LanguagePicker.jsx`.
 *
 * Each option renders in its own script, so the label is drawn with that
 * language's display face rather than the currently active one.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors, display, palette, radius } from '../theme';
import { scriptFor } from '../theme/fonts';
import { useType } from '../theme/useType';
import { LANGUAGES, type LanguageCode } from '../i18n/strings';

export type LanguagePickerProps = {
  value: LanguageCode;
  onChange?: (code: LanguageCode) => void;
  style?: StyleProp<ViewStyle>;
};

export function LanguagePicker({ value, onChange, style }: LanguagePickerProps) {
  const type = useType();

  return (
    <View style={[styles.list, style]}>
      {LANGUAGES.map((lang) => {
        const selected = value === lang.code;
        return (
          <Pressable
            key={lang.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={lang.label}
            onPress={() => onChange?.(lang.code)}
            style={[
              styles.option,
              selected
                ? { borderWidth: 2, borderColor: palette.paprika600 }
                : { borderWidth: 1.5, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.text}>
              {/* Native name renders in its own script's display face. */}
              <Text style={display(17, 700, scriptFor(lang.code))}>{lang.native}</Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                {lang.label}
                {lang.code === 'en' ? ' · Default' : ''}
              </Text>
            </View>
            {selected ? (
              <View style={styles.check}>
                <Check size={13} color="#FFFFFF" strokeWidth={3.5} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  text: { flex: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
