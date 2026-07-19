/**
 * Kitchen storefront — 170pt hero with a bottom cocoa scrim, Combos/Meals
 * segmented tabs (combos first, a deliberate decision), a bulk-quote entry row,
 * and dish rows with an Add button that becomes a quantity stepper.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Star, Users } from 'lucide-react-native';

import {
  Button,
  IconButton,
  Media,
  Screen,
  Stepper,
  Tabs,
  VegDot,
} from '../../components';
import { colors, layout, overlays, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { money } from '../../lib/format';
import type { Dish } from '../../data/types';
import type { CustomerStackScreen } from '../../navigation/types';

const HERO_HEIGHT = 170;
/** Combos are listed before meals. */
const TAB_ORDER = ['Combos', 'Meals'] as const;

export function KitchenScreen({ navigation, route }: CustomerStackScreen<'Kitchen'>) {
  const { slug } = route.params;
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { getKitchen } = useStore();
  const cart = useCart();
  const [tab, setTab] = useState<string>(TAB_ORDER[0]);

  const kitchen = getKitchen(slug);
  if (!kitchen) return null;

  const items = tab === 'Meals' ? kitchen.menu : kitchen.combos;

  return (
    <View style={styles.root}>
      <Screen scroll bottomInset={cart.count > 0 ? 96 : 16} style={styles.screen}>
        {/* Hero sits under the status bar, so it opts out of Screen's top inset. */}
        <Media fill={kitchen.image} style={styles.hero}>
          <View style={[styles.backButton, { top: insets.top + 10 }]}>
            <IconButton label="Back" onPress={() => navigation.goBack()} style={styles.backSurface}>
              <ArrowLeft size={20} color={colors.textBrand} strokeWidth={1.75} />
            </IconButton>
          </View>
          <LinearGradient colors={[...overlays.heroScrim]} style={styles.scrim}>
            <Text style={[type.display(24, 800), styles.heroTitle]} numberOfLines={1}>
              {kitchen.name}
            </Text>
            <View style={styles.heroMeta}>
              <Text style={[type.body(13, 600), styles.heroMetaText]}>
                {kitchen.cuisine} · {kitchen.distance} ·{' '}
              </Text>
              <Star size={13} color={palette.turmeric500} fill={palette.turmeric500} strokeWidth={1.75} />
              <Text style={[type.body(13, 600), styles.heroMetaText]}> {kitchen.rating}</Text>
            </View>
          </LinearGradient>
        </Media>

        <View style={styles.body}>
          <Tabs tabs={[...TAB_ORDER]} active={tab} onChange={setTab} />

          <Button
            variant="ghost"
            onPress={() => navigation.navigate('Bulk', { slug })}
            style={styles.bulkRow}
            block
          >
            <Users size={16} color={colors.textBrand} strokeWidth={1.75} />
            <Text style={[type.body(13, 700), styles.bulkText]}>
              Feeding a crowd? Request a bulk quote
            </Text>
            <ChevronRight size={16} color={colors.textBrand} strokeWidth={1.75} />
          </Button>

          <View style={styles.dishes}>
            {items.length === 0 ? (
              <Text style={[type.body(14, 600), styles.empty]}>
                No combos yet — the chef is still stirring ideas.
              </Text>
            ) : null}

            {items.map((dish) => (
              <DishRow
                key={dish.id}
                dish={dish}
                quantity={cart.items[dish.id] ?? 0}
                addLabel={t.addToCart}
                onAdd={(delta) => cart.add(slug, dish.id, delta)}
              />
            ))}
          </View>
        </View>
      </Screen>

      {cart.count > 0 ? (
        <View style={[styles.sticky, { paddingBottom: 16 }]}>
          <Button block onPress={() => navigation.navigate('Cart')}>
            {`${t.viewCart} · ${cart.count}`}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function DishRow({
  dish,
  quantity,
  addLabel,
  onAdd,
}: {
  dish: Dish;
  quantity: number;
  addLabel: string;
  onAdd: (delta: number) => void;
}) {
  const type = useType();
  const unavailable = dish.available === false;

  return (
    <View style={[styles.dishRow, shadow.card, unavailable ? styles.dimmed : null]}>
      <Media fill={dish.image} style={styles.thumb} />

      <View style={styles.dishBody}>
        <View style={styles.dishName}>
          <VegDot veg={dish.veg} />
          <Text style={[type.body(15, 700), styles.dishNameText]} numberOfLines={1}>
            {dish.name}
          </Text>
        </View>

        {dish.description ? (
          <Text style={[type.body(12, 600), styles.dishDesc]} numberOfLines={1}>
            {dish.description}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={[type.body(13, 800), { color: colors.textBrand }]}>{money(dish.price)}</Text>
          <Text style={[type.body(13, 600), styles.oldPrice]}>{money(dish.oldPrice)}</Text>
        </View>
      </View>

      {quantity > 0 ? (
        <Stepper value={quantity} onChange={(next) => onAdd(next - quantity)} min={0} />
      ) : (
        <Button size="sm" variant="secondary" disabled={unavailable} onPress={() => onAdd(1)}>
          {addLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfacePage },
  // The hero bleeds to the top edge, so this screen manages its own top inset.
  screen: { paddingTop: 0 },
  hero: { height: HERO_HEIGHT, justifyContent: 'flex-end' },
  backButton: { position: 'absolute', left: 12 },
  backSurface: { backgroundColor: 'rgba(255,252,248,0.9)' },
  scrim: { paddingTop: 40, paddingBottom: 14, paddingHorizontal: layout.gutter },
  heroTitle: { color: '#FFFFFF' },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroMetaText: { color: 'rgba(255,248,240,0.9)' },
  body: { padding: 14, paddingHorizontal: layout.gutter },
  bulkRow: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'flex-start',
  },
  bulkText: { flex: 1, color: colors.textBrand },
  dishes: { gap: 10, marginTop: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 24 },
  dishRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dimmed: { opacity: 0.55 },
  thumb: { width: 60, height: 60, borderRadius: 12 },
  dishBody: { flex: 1, minWidth: 0 },
  dishName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dishNameText: { flex: 1 },
  dishDesc: { color: colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  oldPrice: { color: colors.textFaint, textDecorationLine: 'line-through' },
  sticky: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    bottom: 0,
  },
});
