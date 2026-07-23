/**
 * Nandhan Delight brand logo, drawn in code so it stays crisp at any size and
 * follows the theme. A faithful rendering of the supplied mark: an "ND"
 * monogram in a paprika rounded square ringed by a turmeric dashed circle,
 * with the wordmark and "HOT · HOMEMADE · TIRUPPUR" tagline beneath.
 *
 * To swap in an exact raster logo later, drop the PNG at
 * `assets/brand/logo.png` and render it here instead of the drawn mark.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { displayFont, palette } from '../theme';

/** Just the square monogram — also the basis for the app launcher icon. */
export function BrandMark({ size = 96 }: { size?: number }) {
  const ring = size * 0.72;
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.24, backgroundColor: palette.paprika500 },
      ]}
    >
      {/* Dashed turmeric ring. */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ring / 2}
          stroke={palette.turmeric500}
          strokeWidth={size * 0.03}
          strokeDasharray={`${size * 0.05} ${size * 0.045}`}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text
        style={{
          fontFamily: displayFont(800),
          fontSize: size * 0.36,
          color: palette.cream100,
          letterSpacing: size * 0.005,
        }}
      >
        ND
      </Text>
    </View>
  );
}

export type BrandLogoProps = {
  size?: number;
  /** Show the "Nandhan Delight" wordmark and tagline under the mark. */
  showWordmark?: boolean;
};

export function BrandLogo({ size = 96, showWordmark = true }: BrandLogoProps) {
  return (
    <View style={styles.logo}>
      <BrandMark size={size} />
      {showWordmark ? (
        <>
          <Text style={[styles.wordmark, { fontSize: size * 0.34 }]}>Nandhan Delight</Text>
          <Text style={[styles.tagline, { fontSize: size * 0.12 }]}>HOT · HOMEMADE · TIRUPPUR</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: 8 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: displayFont(800),
    color: palette.cocoa900,
    marginTop: 6,
  },
  tagline: {
    fontFamily: displayFont(700),
    color: palette.cocoa500,
    letterSpacing: 3,
  },
});
