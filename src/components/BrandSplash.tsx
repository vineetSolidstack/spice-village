/**
 * Branded open animation for the customer app.
 *
 * Two warm "doors" part down the middle to reveal the Nandhan Delight mark,
 * which springs in as the wordmark and tagline rise beneath it. The whole
 * overlay then fades to hand off to the app. Plays once per cold start.
 *
 * Built on React Native's Animated so it needs no extra dependency and runs on
 * the native driver (transform + opacity only) for a smooth 60fps reveal.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from './BrandLogo';
import { displayFont, palette } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const HALF = SCREEN_W / 2 + 2; // +2 so the doors fully clear the seam.

export function BrandSplash({ onDone }: { onDone: () => void }) {
  // One driver per moving part; all run on the native driver.
  const doors = useRef(new Animated.Value(0)).current; // 0 closed → 1 open
  const mark = useRef(new Animated.Value(0)).current; // scale/opacity of the mark
  const words = useRef(new Animated.Value(0)).current; // wordmark + tagline rise
  const fade = useRef(new Animated.Value(1)).current; // whole-overlay opacity

  useEffect(() => {
    const run = Animated.sequence([
      // Small beat, then the mark eases in behind the closed doors.
      Animated.delay(180),
      Animated.parallel([
        Animated.spring(mark, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        // Doors part with an ease-in-out for a deliberate, welcoming open.
        Animated.timing(doors, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(words, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(560),
      Animated.timing(fade, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => run.stop();
  }, [doors, mark, words, fade, onDone]);

  const leftDoor = doors.interpolate({ inputRange: [0, 1], outputRange: [0, -HALF] });
  const rightDoor = doors.interpolate({ inputRange: [0, 1], outputRange: [0, HALF] });
  const wordsShift = words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      {/* Revealed behind the doors: the mark and wordmark on cream. */}
      <View style={styles.center}>
        <Animated.View style={{ opacity: mark, transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }}>
          <BrandMark size={112} />
        </Animated.View>
        <Animated.View style={[styles.words, { opacity: words, transform: [{ translateY: wordsShift }] }]}>
          <Text style={styles.wordmark}>Nandhan Delight</Text>
          <Text style={styles.tagline}>HOT · HOMEMADE · TIRUPPUR</Text>
        </Animated.View>
      </View>

      {/* The two doors, sitting above the reveal until they part. */}
      <Animated.View style={[styles.door, styles.leftDoor, { transform: [{ translateX: leftDoor }] }]}>
        <View style={styles.seam} />
      </Animated.View>
      <Animated.View style={[styles.door, styles.rightDoor, { transform: [{ translateX: rightDoor }] }]}>
        <View style={[styles.seam, styles.seamRight]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.cream100, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 14 },
  words: { alignItems: 'center', gap: 6 },
  wordmark: { fontFamily: displayFont(800), fontSize: 30, color: palette.cocoa900 },
  tagline: { fontFamily: displayFont(700), fontSize: 12, letterSpacing: 3, color: palette.paprika600 },
  door: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HALF,
    backgroundColor: palette.paprika500,
  },
  leftDoor: { left: 0 },
  rightDoor: { right: 0 },
  // A turmeric hairline down the inner edge, so the seam reads as a doorway.
  seam: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: palette.turmeric500, opacity: 0.7 },
  seamRight: { right: undefined, left: 0 },
});
