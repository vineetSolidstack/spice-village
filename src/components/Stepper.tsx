/**
 * Pill quantity stepper — the paprika-tinted −/N/+ control used for cart
 * quantities, workshop participants, and kitchen-side slot caps.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { colors, radius } from '../theme';
import { useType } from '../theme/useType';
import { IconButton } from './IconButton';

export type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Diameter of the −/+ buttons. */
  size?: number;
  /** Accessible noun, e.g. "quantity", "participants", "capacity". */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  size = 30,
  label = 'quantity',
  style,
}: StepperProps) {
  const type = useType();
  return (
    <View style={[styles.track, style]}>
      <IconButton
        label={`Decrease ${label}`}
        size={size}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={16} color={colors.textBrand} strokeWidth={1.75} />
      </IconButton>
      <Text style={[type.body(14, 800), styles.value, { color: colors.textBrand }]}>{value}</Text>
      <IconButton
        label={`Increase ${label}`}
        size={size}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={16} color={colors.textBrand} strokeWidth={1.75} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceBrandSoft,
    borderRadius: radius.pill,
    padding: 4,
    alignSelf: 'flex-start',
  },
  value: { minWidth: 22, textAlign: 'center' },
});
