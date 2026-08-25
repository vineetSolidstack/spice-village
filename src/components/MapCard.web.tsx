/**
 * MapCard (web) — a small live pickup-location map with a directions bar.
 *
 * Web uses a real Google Maps <iframe> (keyless `output=embed`). The native
 * build uses the sibling MapCard.tsx (a WebView) with the same layout.
 */
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';

import { colors, palette, radius, shadow } from '../theme';
import { useType } from '../theme/useType';
import { parseMapLocation } from '../lib/mapLocation';

type Props = {
  mapUrl?: string | null;
  label?: string;
  title?: string;
  style?: ViewStyle;
};

export function MapCard({ mapUrl, label, title, style }: Props) {
  const type = useType();
  const loc = parseMapLocation(mapUrl);

  if (!loc) {
    if (!mapUrl) return null;
    return (
      <Pressable style={styles.linkRow} onPress={() => void Linking.openURL(mapUrl)}>
        <MapPin size={16} color={colors.textBrand} strokeWidth={2.2} />
        <Text style={[type.body(13, 700), { color: colors.textBrand }]}> View on map</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, shadow.card, style]}>
      {/* Raw DOM iframe — react-native-web renders this straight to the page. */}
      <iframe
        src={loc.embedUrl}
        title={title ?? 'Pickup location map'}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {label ? (
        <View style={styles.chip} pointerEvents="none">
          <MapPin size={13} color={colors.textBrand} strokeWidth={2.4} />
          <Text style={type.body(12, 800)}> {label}</Text>
        </View>
      ) : null}

      <View style={styles.bar}>
        <View style={styles.barText}>
          <Text style={[type.body(12, 800), { color: palette.cocoa900 }]} numberOfLines={1}>
            {title ?? 'Pickup location'}
          </Text>
          <Text style={[type.body(11, 600), { color: palette.cocoa500 }]}>Drag to look around</Text>
        </View>
        <Pressable style={styles.dirBtn} onPress={() => void Linking.openURL(loc.directionsUrl)}>
          <Navigation size={14} color={palette.cream100} strokeWidth={2.4} />
          <Text style={[type.body(13, 700), { color: palette.cream100 }]}> Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    ...shadow.card,
  },
  bar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255,248,240,0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
  },
  barText: { flex: 1, minWidth: 0 },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textBrand,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
});
