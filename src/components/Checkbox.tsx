/**
 * Paprika-filled checkbox, 7px radius — port of `components/core/Checkbox.jsx`.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors } from '../theme';
import { useType } from '../theme/useType';

export type CheckboxProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function Checkbox({ checked, onChange, label, style }: CheckboxProps) {
  const type = useType();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange?.(!checked)}
      style={[styles.row, style]}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: colors.actionPrimary }
            : { backgroundColor: colors.surfaceCard, borderWidth: 2, borderColor: colors.borderStrong },
        ]}
      >
        {checked ? <Check size={14} color="#FFFFFF" strokeWidth={3.5} /> : null}
      </View>
      {label ? <Text style={type.body(14, 600)}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
