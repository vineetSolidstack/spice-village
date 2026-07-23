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
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../theme';

/** A 135° two-stop gradient, matching the prototypes' placeholder fills. */
export type GradientFill = { kind: 'gradient'; colors: readonly [string, string] };
/** A remote photograph, e.g. a kitchen's upload in Supabase Storage. */
export type PhotoFill = { kind: 'photo'; uri: string };
/** A photograph bundled into the app via `require(...)`. */
export type AssetFill = { kind: 'asset'; source: ImageSourcePropType };
export type MediaFill = GradientFill | PhotoFill | AssetFill;

export function gradient(from: string, to: string): GradientFill {
  return { kind: 'gradient', colors: [from, to] };
}

export function photo(uri: string): PhotoFill {
  return { kind: 'photo', uri };
}

export function asset(source: ImageSourcePropType): AssetFill {
  return { kind: 'asset', source };
}

export type MediaProps = {
  fill?: MediaFill;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Media({ fill, style, children }: MediaProps) {
  if (!fill) return <View style={[styles.fallback, style]}>{children}</View>;

  if (fill.kind === 'photo' || fill.kind === 'asset') {
    const source = fill.kind === 'photo' ? { uri: fill.uri } : fill.source;
    return (
      <View style={[styles.fallback, style]}>
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {children}
      </View>
    );
  }

  if (fill.kind === 'gradient') {
    return (
      // 135deg in CSS runs top-left → bottom-right.
      <LinearGradient colors={fill.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.fallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: palette.cream200, overflow: 'hidden' },
});
