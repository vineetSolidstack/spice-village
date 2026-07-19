/**
 * Shared bottom tab bar.
 *
 * Cream at 96% with a backdrop blur; the active tab is paprika at weight 800.
 * All four portals use this bar so the shells stay visually identical.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors, overlays } from '../theme';
import { useType } from '../theme/useType';

/** Each route supplies its icon through `options.tabBarIcon`. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const type = useType();
  const insets = useSafeAreaInsets();

  const bar = (
    <View style={[styles.bar, { paddingBottom: 10 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={styles.tab}
          >
            {options.tabBarIcon?.({
              focused,
              color: focused ? colors.textBrand : colors.textMuted,
              size: 22,
            })}
            <Text
              style={[
                type.body(11, focused ? 800 : 600),
                { color: focused ? colors.textBrand : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (Platform.OS === 'web') {
    return <View style={[styles.surface, { backgroundColor: overlays.tabBar }]}>{bar}</View>;
  }

  return (
    <BlurView intensity={overlays.blurIntensity} tint="light" style={styles.surface}>
      <View style={{ backgroundColor: overlays.tabBar }}>{bar}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
});
