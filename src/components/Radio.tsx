/**
 * Radio option with label and optional description — port of
 * `components/core/Radio.jsx`. Checked state is a 7px paprika ring.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';
import { useType } from '../theme/useType';

export type RadioProps = {
  checked: boolean;
  onChange?: () => void;
  label: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

export function Radio({ checked, onChange, label, description, style }: RadioProps) {
  const type = useType();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onChange}
      style={[styles.row, style]}
    >
      <View
        style={[
          styles.dot,
          checked
            ? { borderWidth: 7, borderColor: colors.actionPrimary }
            : { borderWidth: 2, borderColor: colors.borderStrong },
        ]}
      />
      <View style={styles.text}>
        <Text style={type.body(14, 700)}>{label}</Text>
        {description ? (
          <Text style={[type.body(12, 600), { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceCard,
    marginTop: 1,
  },
  text: { flex: 1 },
});
