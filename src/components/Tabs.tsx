/**
 * Segmented pill tabs — port of `components/core/Tabs.jsx`.
 * Used for Combos/Meals on the kitchen storefront and Pending/Approved/Suspended
 * in the super-admin portal.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette, radius, shadow } from '../theme';
import { useType } from '../theme/useType';

export type TabsProps = {
  tabs: string[];
  active: string;
  onChange?: (tab: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function Tabs({ tabs, active, onChange, style }: TabsProps) {
  const type = useType();
  return (
    <View style={[styles.track, style]}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange?.(tab)}
            style={[styles.tab, isActive ? [styles.tabActive, shadow.card] : null]}
          >
            <Text
              style={[type.body(13, 700), { color: isActive ? colors.textBrand : colors.textMuted }]}
              numberOfLines={1}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: palette.cream200,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.surfaceCard },
});
