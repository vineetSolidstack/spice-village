/**
 * Labelled text input — port of `components/core/Input.jsx`.
 * 12px radius; focus switches the border to `--border-focus`, `error` to danger.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius } from '../theme';
import { useType } from '../theme/useType';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  /** Error message; also switches the border to danger. */
  error?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Input({ label, hint, error, icon, style, onFocus, onBlur, ...rest }: InputProps) {
  const type = useType();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.statusDanger : focused ? colors.borderFocus : colors.borderSubtle;

  return (
    <View style={style}>
      {label ? <Text style={[type.body(13, 700), styles.label]}>{label}</Text> : null}
      <View style={[styles.field, { borderColor }]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textFaint}
          style={[type.body(15, 600), styles.input]}
        />
      </View>
      {error ? (
        <Text style={[type.body(12, 600), styles.helper, { color: colors.statusDanger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.body(12, 600), styles.helper, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    // Vertical padding is baked into the TextInput so the caret sits centred.
    minHeight: 46,
  },
  icon: { justifyContent: 'center' },
  input: { flex: 1, paddingVertical: 11, color: colors.textBody },
  helper: { marginTop: 4 },
});
