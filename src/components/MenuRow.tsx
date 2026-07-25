/**
 * Menu list row — name and price on the left, photo with a floating add button
 * on the right.
 *
 * This is the layout modern delivery apps converged on because it scans fast:
 * the eye runs down a single column of names and prices, and the photo sits out
 * of the reading path. Ours keeps the warm palette, rounded corners, and the
 * veg/non-veg mark that Indian menus need.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { colors, motion, radius, shadow } from '../theme';
import { useType } from '../theme/useType';
import { money } from '../lib/format';
import { Media, type MediaFill } from './Media';
import { AutoCarousel } from './AutoCarousel';
import { VegDot } from './Bits';

/** One image, or an auto-swiping carousel when a dish has several. */
function Photo({ image, gallery, style }: { image?: MediaFill; gallery?: MediaFill[]; style: StyleProp<ViewStyle> }) {
  if (gallery && gallery.length > 1) return <AutoCarousel photos={gallery} style={style} showDots />;
  return <Media fill={gallery?.[0] ?? image} style={style} />;
}

export type MenuRowProps = {
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  veg: boolean;
  image?: MediaFill;
  /** All photos for the dish; more than one auto-swipes. */
  gallery?: MediaFill[];
  /** Quantity already in the cart; drives the badge on the add button. */
  quantity?: number;
  available?: boolean;
  onAdd: () => void;
  onPress?: () => void;
};

const THUMB = 116;

export function MenuRow({
  name,
  description,
  price,
  oldPrice,
  veg,
  image,
  gallery,
  quantity = 0,
  available = true,
  onAdd,
  onPress,
}: MenuRowProps) {
  const type = useType();
  const inCart = quantity > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!available}
      style={({ pressed }) => [
        styles.row,
        !available ? styles.dimmed : null,
        pressed && onPress ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={styles.body}>
        <View style={styles.nameLine}>
          <VegDot veg={veg} size={13} />
          <Text style={[type.body(16, 700), styles.name]} numberOfLines={2}>
            {name}
          </Text>
        </View>

        <View style={styles.priceLine}>
          <Text style={type.body(14, 700)}>{money(price)}</Text>
          {oldPrice && oldPrice > price ? (
            <>
              <Text style={[type.body(13, 600), styles.oldPrice]}>{money(oldPrice)}</Text>
              <View style={styles.savePill}>
                <Text style={[type.body(11, 800), styles.saveText]}>
                  {Math.round(((oldPrice - price) / oldPrice) * 100)}% off
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {description ? (
          <Text style={[type.body(13, 400), styles.description]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {!available ? (
          <Text style={[type.body(12, 700), styles.soldOut]}>Not available today</Text>
        ) : null}
      </View>

      {/* Photo (auto-swipes if the dish has several) with the add button over it. */}
      <View style={styles.thumbWrap}>
        <Photo image={image} gallery={gallery} style={styles.thumb} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={inCart ? `${name}, ${quantity} in cart` : `Add ${name}`}
          disabled={!available}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            shadow.card,
            inCart ? styles.addActive : null,
            { transform: [{ scale: pressed ? motion.pressScale : 1 }] },
          ]}
        >
          {inCart ? (
            <View style={styles.addCount}>
              <Text style={[type.body(13, 800), styles.addCountText]}>{quantity}</Text>
            </View>
          ) : (
            <Plus size={20} color={colors.textBody} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Compact card for the horizontal "Popular" strip. */
export function MenuCard({
  name,
  price,
  image,
  gallery,
  badge,
  quantity = 0,
  onAdd,
}: {
  name: string;
  price: number;
  image?: MediaFill;
  gallery?: MediaFill[];
  badge?: string;
  quantity?: number;
  onAdd: () => void;
}) {
  const type = useType();
  return (
    <View style={styles.card}>
      <View style={styles.cardMediaWrap}>
        <Photo image={image} gallery={gallery} style={styles.cardMedia} />
        {badge ? (
          <View style={styles.cardBadge}>
            <Text style={[type.body(11, 800), styles.cardBadgeText]}>{badge}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${name}`}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            shadow.card,
            quantity > 0 ? styles.addActive : null,
            { transform: [{ scale: pressed ? motion.pressScale : 1 }] },
          ]}
        >
          {quantity > 0 ? (
            <View style={styles.addCount}>
              <Text style={[type.body(13, 800), styles.addCountText]}>{quantity}</Text>
            </View>
          ) : (
            <Plus size={20} color={colors.textBody} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
      <Text style={[type.body(14, 700), styles.cardName]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{money(price)}</Text>
    </View>
  );
}

/** Selected-state tick used by the category filter chips. */
export function ChipCheck() {
  return <Check size={14} color="#FFFFFF" strokeWidth={3} />;
}

const CARD_W = 170;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dimmed: { opacity: 0.5 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  oldPrice: { color: colors.textFaint, textDecorationLine: 'line-through' },
  savePill: {
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveText: { color: colors.statusSuccess },
  description: { color: colors.textMuted, lineHeight: 18 },
  soldOut: { color: colors.statusDanger, marginTop: 2 },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md },
  add: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addActive: { backgroundColor: colors.actionPrimary },
  addCount: { alignItems: 'center', justifyContent: 'center' },
  addCountText: { color: '#FFFFFF' },
  card: { width: CARD_W, gap: 4 },
  cardMediaWrap: { width: CARD_W, height: CARD_W * 0.82, marginBottom: 6 },
  cardMedia: { width: '100%', height: '100%', borderRadius: radius.md },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.statusSuccess,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardBadgeText: { color: '#FFFFFF' },
  cardName: {},
});
