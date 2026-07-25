/**
 * Auto-advancing photo carousel.
 *
 * When a dish has more than one photo, this cross-fades through them on a timer
 * so the storefront feels alive without the customer having to swipe. A single
 * photo renders as a plain image with no timer. Tiny dots mark the count.
 *
 * Uses a fade (opacity) rather than horizontal paging so it works identically
 * inside a small menu thumbnail and a full-width hero.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion } from '../theme';
import { Media, type MediaFill } from './Media';

export type AutoCarouselProps = {
  photos: MediaFill[];
  style?: StyleProp<ViewStyle>;
  /** Seconds each photo is shown before the next fades in. */
  interval?: number;
  /** Show the little position dots (off for tiny thumbnails). */
  showDots?: boolean;
  children?: React.ReactNode;
};

export function AutoCarousel({
  photos,
  style,
  interval = 3,
  showDots = false,
  children,
}: AutoCarouselProps) {
  const list = photos.length ? photos : [];
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (list.length < 2) return;

    const easing = motion.easeOut;
    const timer = setInterval(() => {
      // Fade out, swap the photo, fade back in.
      Animated.timing(fade, {
        toValue: 0,
        duration: motion.durBase,
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % list.length);
        Animated.timing(fade, { toValue: 1, duration: motion.durBase, useNativeDriver: true }).start();
      });
    }, interval * 1000);

    return () => clearInterval(timer);
    // easing referenced to keep the brand curve intent explicit for readers.
    void easing;
  }, [list.length, interval, fade]);

  // Guard against the index dangling if the photo count shrinks.
  const safeIndex = index < list.length ? index : 0;

  return (
    <View style={style}>
      {list.length ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Media fill={list[safeIndex]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : (
        <Media style={StyleSheet.absoluteFill} />
      )}

      {showDots && list.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {list.map((_, i) => (
            <View key={i} style={[styles.dot, i === safeIndex ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: { backgroundColor: colors.surfaceCard, width: 16 },
});
