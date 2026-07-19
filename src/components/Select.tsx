/**
 * Select styled to match Input — port of `components/core/Select.jsx`.
 *
 * The web prototype uses a native `<select>`. React Native has no equivalent, so
 * the field opens the brand's bottom sheet (20px radius + grab handle), which is
 * the mobile-native analogue and keeps the visual language consistent.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

import { colors, radius } from '../theme';
import { useType } from '../theme/useType';
import { Dialog } from './Dialog';

export type SelectOption = string | { value: string; label: string };

export type SelectProps = {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Sheet heading; defaults to `label`. */
  title?: string;
  style?: StyleProp<ViewStyle>;
};

const valueOf = (o: SelectOption) => (typeof o === 'string' ? o : o.value);
const labelOf = (o: SelectOption) => (typeof o === 'string' ? o : o.label);

export function Select({ label, options, value, onChange, title, style }: SelectProps) {
  const type = useType();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => valueOf(o) === value);

  return (
    <View style={style}>
      {label ? <Text style={[type.body(13, 700), styles.label]}>{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected ? labelOf(selected) : undefined }}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text
          style={[type.body(15, 600), { flex: 1, color: selected ? colors.textBody : colors.textFaint }]}
          numberOfLines={1}
        >
          {selected ? labelOf(selected) : 'Select…'}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      <Dialog open={open} onClose={() => setOpen(false)} title={title ?? label}>
        <ScrollView style={styles.list} bounces={false}>
          {options.map((o) => {
            const v = valueOf(o);
            const isSelected = v === value;
            return (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange?.(v);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text
                  style={[
                    type.body(15, isSelected ? 700 : 600),
                    { flex: 1, color: isSelected ? colors.textBrand : colors.textBody },
                  ]}
                >
                  {labelOf(o)}
                </Text>
                {isSelected ? <Check size={18} color={colors.textBrand} strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  list: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
});
