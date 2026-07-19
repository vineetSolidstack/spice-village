/**
 * Food imagery.
 *
 * The prototypes use CSS `linear-gradient(135deg, …)` placeholders everywhere a
 * photo will eventually go. The handoff is explicit that these are placeholders
 * to be replaced with real photography uploaded to Supabase Storage — so this
 * component accepts either fill and renders the same box, letting screens swap
 * one for the other without layout changes.
 */
import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../theme';

/** A 135° two-stop gradient, matching the prototypes' placeholder fills. */
export type GradientFill = { kind: 'gradient'; colors: readonly [string, string] };
/** A real photograph, once kitchens have uploaded one. */
export type PhotoFill = { kind: 'photo'; uri: string };
export type MediaFill = GradientFill | PhotoFill;

export function gradient(from: string, to: string): GradientFill {
  return { kind: 'gradient', colors: [from, to] };
}

export function photo(uri: string): PhotoFill {
  return { kind: 'photo', uri };
}

export type MediaProps = {
  fill?: MediaFill;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Media({ fill, style, children }: MediaProps) {
  if (!fill) return <View style={[styles.fallback, style]}>{children}</View>;

  if (fill.kind === 'photo') {
    return (
      <View style={[styles.fallback, style]}>
        <Image source={{ uri: fill.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {children}
      </View>
    );
  }

  return (
    // 135deg in CSS runs top-left → bottom-right.
    <LinearGradient
      colors={fill.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: palette.cream200, overflow: 'hidden' },
});
