/**
 * Small uppercase status pill — port of `components/core/Badge.jsx`.
 * The one place ALL CAPS is allowed per the content fundamentals.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette, radius } from '../theme';
import { useType } from '../theme/useType';

export type BadgeTone = 'brand' | 'accent' | 'success' | 'danger' | 'info' | 'warn' | 'neutral';

export type BadgeProps = {
  tone?: BadgeTone;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  brand: { bg: colors.surfaceBrandSoft, fg: colors.textBrand },
  accent: { bg: palette.turmeric100, fg: palette.turmeric600 },
  success: { bg: colors.statusSuccessBg, fg: colors.statusSuccess },
  danger: { bg: colors.statusDangerBg, fg: colors.statusDanger },
  info: { bg: colors.statusInfoBg, fg: colors.statusInfo },
  warn: { bg: colors.statusWarnBg, fg: colors.statusWarn },
  neutral: { bg: palette.cream200, fg: palette.cocoa500 },
};

export function Badge({ tone = 'brand', children, style }: BadgeProps) {
  const type = useType();
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      <Text style={[type.body(11, 700), styles.text, { color: t.fg }]} numberOfLines={1}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: { letterSpacing: 0.33, lineHeight: 15 },
});
