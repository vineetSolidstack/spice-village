/**
 * Small shared marks that recur across portals.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, displayFont, palette, radius, shadow } from '../theme';
import { useType } from '../theme/useType';

/* ------------------------------------------------------------- veg mark --- */

/** The Indian veg/non-veg square: mint for veg, chili for non-veg. */
export function VegDot({ veg, size = 14 }: { veg: boolean; size?: number }) {
  const tint = veg ? colors.statusSuccess : colors.statusDanger;
  return (
    <View
      accessibilityLabel={veg ? 'Vegetarian' : 'Non-vegetarian'}
      style={[styles.vegBox, { width: size, height: size, borderColor: tint }]}
    >
      <View style={{ width: size * 0.43, height: size * 0.43, borderRadius: size, backgroundColor: tint }} />
    </View>
  );
}

/* ------------------------------------------------------------ slot code --- */

/**
 * The dark slot-code chip (e.g. "500-07"). Staff sort physical covers by these,
 * so it always renders in the display face with generous letter-spacing.
 */
export function SlotCodeChip({ code, size = 'sm' }: { code: string; size?: 'sm' | 'md' }) {
  const fontSize = size === 'md' ? 14 : 13;
  const style: TextStyle = {
    fontFamily: displayFont(800),
    fontSize,
    color: '#FFFFFF',
    letterSpacing: fontSize * 0.05,
  };
  return (
    <View style={[styles.slotChip, size === 'md' ? styles.slotChipMd : null]}>
      <Text style={style}>{code}</Text>
    </View>
  );
}

/* ------------------------------------------------------------ stat card --- */

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const type = useType();
  return (
    <View style={[styles.stat, shadow.card]}>
      <Text style={[type.display(24, 800), tone ? { color: tone } : null]}>{value}</Text>
      <Text style={[type.body(12, 600), { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

/* --------------------------------------------------------- section label -- */

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const type = useType();
  return (
    <Text style={[type.body(13, 700), { color: colors.textMuted }, style as TextStyle]}>{children}</Text>
  );
}

/* ---------------------------------------------------------------- avatar -- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontFamily: displayFont(800), fontSize: size * 0.4, color: colors.textBrand }}>
        {initial}
      </Text>
    </View>
  );
}

/* ----------------------------------------------------------- info banner -- */

/** Turmeric-tinted explainer banner (savings, capacity rules, bulk notes). */
export function InfoBanner({
  icon,
  children,
  weight = 700,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  weight?: 600 | 700;
}) {
  const type = useType();
  return (
    <View style={styles.banner}>
      {icon}
      <Text style={[type.body(13, weight), styles.bannerText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  vegBox: {
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChip: {
    backgroundColor: palette.cocoa900,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  slotChipMd: { paddingVertical: 4, paddingHorizontal: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
  },
  avatar: {
    backgroundColor: colors.surfaceBrandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAccentSoft,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: { flex: 1, color: palette.turmeric600 },
});
