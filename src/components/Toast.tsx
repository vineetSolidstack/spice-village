/**
 * Solid toast bar — port of `components/core/Toast.jsx`.
 *
 * Success is where the celebratory pun copy lives (customer surfaces only —
 * kitchen, instructor and super-admin portals use plain functional strings).
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette, radius, shadow } from '../theme';
import { useType } from '../theme/useType';

export type ToastTone = 'success' | 'danger' | 'info';

export type ToastProps = {
  tone?: ToastTone;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const BG: Record<ToastTone, string> = {
  success: colors.statusSuccess,
  danger: colors.statusDanger,
  info: palette.cocoa900,
};

export function Toast({ tone = 'success', children, style }: ToastProps) {
  const type = useType();
  return (
    <View style={[styles.base, shadow.raised, { backgroundColor: BG[tone] }, style]}>
      {typeof children === 'string' ? (
        <Text style={[type.body(14, 700), styles.text]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: { color: '#FFFFFF', textAlign: 'center' },
});
