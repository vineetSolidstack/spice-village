/**
 * Sticky top bars.
 *
 * `AppBar` is the customer app's back-arrow bar (18pt display title).
 * `PortalHeader` is the kitchen/instructor/super variant (22pt display title,
 * no back arrow — those portals navigate by tab).
 *
 * Both sit on cream at 92% with a backdrop blur, per the interaction spec.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowLeft } from 'lucide-react-native';

import { colors, layout, overlays } from '../theme';
import { useType } from '../theme/useType';
import { IconButton } from './IconButton';

/** Blur only renders on native; web falls back to the flat cream tint. */
function StickySurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === 'web') {
    return <View style={[{ backgroundColor: overlays.stickyHeader }, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={overlays.blurIntensity} tint="light" style={style}>
      <View style={{ backgroundColor: overlays.stickyHeader }}>{children}</View>
    </BlurView>
  );
}

export type AppBarProps = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function AppBar({ title, onBack, right }: AppBarProps) {
  const type = useType();
  return (
    <StickySurface>
      <View style={styles.bar}>
        {onBack ? (
          <IconButton label="Back" onPress={onBack}>
            <ArrowLeft size={20} color={colors.textBrand} strokeWidth={1.75} />
          </IconButton>
        ) : null}
        <Text style={[type.display(18, 700), styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
    </StickySurface>
  );
}

export type PortalHeaderProps = {
  title: string;
  right?: React.ReactNode;
};

export function PortalHeader({ title, right }: PortalHeaderProps) {
  const type = useType();
  return (
    <StickySurface>
      <View style={styles.portalBar}>
        <Text style={[type.display(22, 800), styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
    </StickySurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  portalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: layout.gutter,
  },
  title: { flex: 1 },
});
