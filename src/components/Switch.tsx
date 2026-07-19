/**
 * Toggle switch — port of `components/core/Switch.jsx`.
 * 44×26 track, 20pt knob, animated over `--dur-base` with the brand easing.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, palette, radius } from '../theme';
import { useType } from '../theme/useType';

export type SwitchProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const KNOB_OFF = 3;
const KNOB_ON = 21;

export function Switch({ checked, onChange, label, disabled = false, style }: SwitchProps) {
  const type = useType();
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: motion.durBase,
      easing: Easing.bezier(motion.easeOut.x1, motion.easeOut.y1, motion.easeOut.x2, motion.easeOut.y2),
      // Track colour interpolation is not supported by the native driver.
      useNativeDriver: false,
    }).start();
  }, [checked, progress]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.cream300, colors.actionPrimary],
  });
  const knobLeft = progress.interpolate({ inputRange: [0, 1], outputRange: [KNOB_OFF, KNOB_ON] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      style={[styles.row, disabled ? { opacity: motion.disabledOpacity } : null, style]}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { left: knobLeft }]} />
      </Animated.View>
      {label ? <Text style={type.body(14, 600)}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { width: 44, height: 26, borderRadius: radius.pill, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgb(43,29,18)',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
