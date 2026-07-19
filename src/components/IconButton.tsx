/**
 * Circular icon-only button — port of `components/core/IconButton.jsx`.
 * `label` is required and becomes the accessibility label.
 */
import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, palette, radius } from '../theme';

export type IconButtonVariant = 'ghost' | 'tonal' | 'solid';

export type IconButtonProps = {
  /** Accessible label (required). */
  label: string;
  variant?: IconButtonVariant;
  /** Diameter in points, default 40. */
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const BG: Record<IconButtonVariant, { rest: string; press: string }> = {
  ghost: { rest: 'transparent', press: colors.surfaceBrandSoft },
  tonal: { rest: colors.surfaceBrandSoft, press: palette.paprika100 },
  solid: { rest: colors.actionPrimary, press: colors.actionPrimaryHover },
};

/** Foreground colour callers should tint their icon with. */
export function iconButtonTint(variant: IconButtonVariant = 'ghost'): string {
  return variant === 'solid' ? '#FFFFFF' : colors.textBrand;
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 40,
  onPress,
  disabled = false,
  children,
  style,
}: IconButtonProps) {
  const bg = BG[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      // Keep a ≥44pt touch target even when the visual size is smaller.
      hitSlop={Math.max(0, Math.round((44 - size) / 2))}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed && !disabled ? bg.press : bg.rest,
          opacity: disabled ? motion.disabledOpacity : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
