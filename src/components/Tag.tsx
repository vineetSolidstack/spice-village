/**
 * Selectable filter chip — port of `components/core/Tag.jsx`.
 * Render in a horizontally scrolling row for cuisine categories.
 */
import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette, radius } from '../theme';
import { useType } from '../theme/useType';

export type TagProps = {
  selected?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Tag({ selected = false, onPress, children, style }: TagProps) {
  const type = useType();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderWidth: 1.5,
          borderColor: selected ? palette.paprika600 : colors.borderSubtle,
          backgroundColor: selected
            ? colors.surfaceBrandSoft
            : pressed
              ? palette.cream200
              : colors.surfaceCard,
        },
        style,
      ]}
    >
      <Text
        style={[type.body(13, 700), { color: selected ? colors.textBrand : colors.textBody }]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </Pressable>
  );
}
