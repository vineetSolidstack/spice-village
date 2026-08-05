/**
 * Full-screen stamp card.
 *
 * Opens from the compact card with a spring: earned stamps pop in one after
 * another, the empty slots pulse a turmeric glow with their number, and a big
 * line counts down how many more orders earn a free combo. Closes with the ✕.
 *
 * All motion runs on the native driver (opacity + transform only) so it stays
 * smooth on a mid-range phone.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Gift, X } from 'lucide-react-native';

import { colors, displayFont, palette, radius } from '../theme';
import { useType } from '../theme/useType';
import type { Loyalty } from '../data/types';

const STAMP = 62;

export function StampCardModal({
  open,
  onClose,
  loyalty,
}: {
  open: boolean;
  onClose: () => void;
  loyalty: Loyalty;
}) {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { stamps, rewards, goal } = loyalty;
  const hasReward = rewards > 0;
  const left = Math.max(0, goal - stamps);

  // reveal drives the staggered pop-in; glow is the empty-slot pulse.
  const reveal = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    enter.setValue(0);
    reveal.setValue(0);
    const intro = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(reveal, {
        toValue: 1,
        duration: 90 * Math.max(1, goal) + 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    intro.start();
    pulse.start();
    return () => {
      intro.stop();
      pulse.stop();
    };
  }, [open, goal, enter, reveal, glow]);

  const sheetStyle = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
    ],
  };
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Animated.View style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }, sheetStyle]}>
          {/* dashed brand ring flourish behind the header */}
          <View style={styles.ringDecor} pointerEvents="none" />

          <View style={styles.topbar}>
            <View style={styles.badge}>
              <Gift size={16} color={palette.cream100} strokeWidth={2.2} />
              <Text style={[type.body(12, 800), { color: palette.cream100, letterSpacing: 0.5 }]}>NANDHAN DELIGHT</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close stamp card" hitSlop={8}>
              <X size={20} color={palette.cream100} strokeWidth={2.4} />
            </Pressable>
          </View>

          <Text style={styles.title}>Stamp Card</Text>
          <Text style={[type.body(14, 600), styles.sub]}>
            A stamp for every order. Fill the card, feast for free.
          </Text>

          <View style={styles.grid}>
            {Array.from({ length: goal }).map((_, i) => {
              const filled = i < stamps;
              // Each stamp animates within its slice of the reveal timeline.
              const start = i / goal;
              const end = (i + 0.9) / goal;
              const scale = reveal.interpolate({
                inputRange: [start, end, 1],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });
              const opacity = reveal.interpolate({
                inputRange: [start, end, 1],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View key={i} style={{ opacity, transform: [{ scale }] }}>
                  {filled ? (
                    <View style={[styles.stamp, styles.stampFilled]}>
                      <Check size={26} color="#FFFFFF" strokeWidth={3.2} />
                    </View>
                  ) : (
                    <View style={styles.stamp}>
                      <Animated.View
                        style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
                      />
                      <Text style={styles.slotNum}>{i + 1}</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.footer}>
            {hasReward ? (
              <>
                <Text style={styles.bigLine}>🎉 Free combo ready!</Text>
                <Text style={[type.body(14, 600), styles.footSub]}>
                  Pick it in your cart at checkout{rewards > 1 ? ` · ${rewards} waiting` : ''}.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bigLine}>
                  <Text style={styles.bigNum}>{left}</Text> {left === 1 ? 'order' : 'orders'} to go
                </Text>
                <Text style={[type.body(14, 600), styles.footSub]}>
                  {stamps} of {goal} stamps collected — keep ordering for a free combo.
                </Text>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(30,18,10,0.55)', justifyContent: 'center', padding: 16 },
  sheet: {
    backgroundColor: palette.paprika600,
    borderRadius: 28,
    paddingHorizontal: 22,
    overflow: 'hidden',
    alignItems: 'center',
  },
  ringDecor: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(232,163,61,0.35)',
    borderStyle: 'dashed',
  },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: displayFont(800),
    fontSize: 34,
    color: palette.cream100,
    marginTop: 18,
    letterSpacing: 0.3,
  },
  sub: { color: 'rgba(255,248,240,0.85)', textAlign: 'center', marginTop: 6, maxWidth: 300 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 30,
    marginBottom: 8,
    maxWidth: STAMP * 4 + 16 * 3 + 4,
  },
  stamp: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,248,240,0.4)',
    backgroundColor: 'rgba(255,248,240,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampFilled: {
    backgroundColor: palette.turmeric500,
    borderColor: palette.cream100,
  },
  glowRing: {
    position: 'absolute',
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    borderWidth: 2,
    borderColor: palette.turmeric500,
  },
  slotNum: {
    fontFamily: displayFont(800),
    fontSize: 20,
    color: 'rgba(255,248,240,0.75)',
  },
  footer: { alignItems: 'center', marginTop: 24 },
  bigLine: { fontFamily: displayFont(800), fontSize: 24, color: palette.cream100, textAlign: 'center' },
  bigNum: { color: palette.turmeric500, fontFamily: displayFont(800), fontSize: 30 },
  footSub: { color: 'rgba(255,248,240,0.85)', textAlign: 'center', marginTop: 6, maxWidth: 320 },
});
