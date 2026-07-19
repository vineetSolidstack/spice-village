/**
 * Mobile bottom-sheet dialog — port of `components/core/Dialog.jsx`.
 * 20px top radius, grab handle, cocoa scrim.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, overlays, palette, radius, shadow } from '../theme';
import { useType } from '../theme/useType';

export type DialogProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Dialog({ open, onClose, title, footer, children, style }: DialogProps) {
  const type = useType();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Tapping the scrim dismisses; taps inside the sheet must not bubble. */}
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          style={[styles.sheet, shadow.overlay, { paddingBottom: 20 + insets.bottom }, style]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          {title ? <Text style={[type.display(18, 700), styles.title]}>{title}</Text> : null}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: overlays.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.cream300,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { marginBottom: 10 },
  footer: { marginTop: layout.cardPadding, flexDirection: 'row', gap: 10 },
});
