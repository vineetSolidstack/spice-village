/**
 * Page container — cream background, safe-area aware, scrolls by default.
 */
import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';

export type ScreenProps = {
  children?: React.ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. FlatList). */
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a sticky action button. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, bottomInset = 0, contentStyle, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top, paddingBottom: bottomInset };

  if (!scroll) {
    return <View style={[styles.page, pad, style]}>{children}</View>;
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top }, style]}>
      <ScrollView
        contentContainerStyle={[{ paddingBottom: bottomInset + 16 }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surfacePage },
});
