/**
 * Pill-shaped action button — port of `components/core/Button.jsx`.
 * Use `primary` for the single main action per view; `secondary` (tonal) for
 * supporting actions.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, radius } from '../theme';
import { useType } from '../theme/useType';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Leading icon node (Lucide). */
  icon?: React.ReactNode;
  onPress?: () => void;
  children?: React.ReactNode;
  /** Stretch to the container width and centre the label. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PADDING: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 12, paddingHorizontal: 24 },
  lg: { paddingVertical: 14, paddingHorizontal: 28 },
};

const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 15 };

type Skin = { bg: string; fg: string; border?: string; pressBg: string };

const SKINS: Record<ButtonVariant, Skin> = {
  primary: { bg: colors.actionPrimary, fg: colors.textOnBrand, pressBg: colors.actionPrimaryHover },
  secondary: { bg: colors.surfaceBrandSoft, fg: colors.textBrand, pressBg: '#FBE3D6' },
  accent: { bg: colors.actionAccent, fg: '#2B1D12', pressBg: colors.actionAccentHover },
  outline: { bg: 'transparent', fg: colors.textBrand, border: colors.borderFocus, pressBg: colors.surfaceBrandSoft },
  ghost: { bg: 'transparent', fg: colors.textBrand, pressBg: colors.surfaceBrandSoft },
  danger: { bg: colors.statusDanger, fg: '#FFFFFF', pressBg: '#A82121' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  onPress,
  children,
  block = false,
  style,
}: ButtonProps) {
  const type = useType();
  const skin = SKINS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        PADDING[size],
        {
          backgroundColor: pressed && !disabled ? skin.pressBg : skin.bg,
          opacity: disabled ? motion.disabledOpacity : 1,
          transform: [{ scale: pressed && !disabled ? motion.pressScale : 1 }],
        },
        skin.border ? { borderWidth: 1.5, borderColor: skin.border } : null,
        block ? styles.block : null,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      {typeof children === 'string' ? (
        <Text style={[type.body(FONT_SIZE[size], 700), { color: skin.fg }]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  block: { alignSelf: 'stretch' },
  icon: { justifyContent: 'center' },
});
