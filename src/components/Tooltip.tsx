/**
 * Cocoa tooltip — port of `components/core/Tooltip.jsx`.
 *
 * The web version triggers on hover. Mobile has no hover, so this reveals on
 * long-press and auto-hides; the component prompt already flags this as an
 * admin-surface affordance.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette } from '../theme';
import { useType } from '../theme/useType';

export type TooltipProps = {
  label: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const VISIBLE_MS = 1600;

export function Tooltip({ label, children, style }: TooltipProps) {
  const type = useType();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setShow(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [show]);

  return (
    <View style={styles.anchor}>
      <Pressable accessibilityHint={label} onLongPress={() => setShow(true)}>
        {children}
      </Pressable>
      {show ? (
        <View style={[styles.bubble, style]} pointerEvents="none">
          <Text style={[type.body(12, 600), styles.text]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative', alignSelf: 'flex-start' },
  bubble: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    alignSelf: 'center',
    backgroundColor: palette.cocoa900,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 50,
  },
  text: { color: '#FFFFFF' },
});
