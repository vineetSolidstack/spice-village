/**
 * White 16px-radius card with a warm shadow — port of `components/core/Card.jsx`.
 * `image` renders a cover strip with the card's top radius.
 */
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radius, shadow } from '../theme';
import { Media, type MediaFill } from './Media';

export type CardProps = {
  /** Cover fill — gradient placeholder or photo. Omit for a text-only card. */
  image?: MediaFill;
  imageHeight?: number;
  onPress?: () => void;
  children?: React.ReactNode;
  /** Set false to render children flush, without the standard 16px padding. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ image, imageHeight = 140, onPress, children, padded = true, style }: CardProps) {
  const content = (
    <>
      {image ? <Media fill={image} style={{ height: imageHeight }} /> : null}
      <View style={padded ? styles.body : null}>{children}</View>
    </>
  );

  if (!onPress) return <View style={[styles.card, shadow.card, style]}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? shadow.raised : shadow.card, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  body: { padding: layout.cardPadding },
});
