/**
 * Single-kitchen ("showcase") home.
 *
 * When the app runs in single mode, the Home tab is the founder's own cloud
 * kitchen — Nandhan Delight — rather than a marketplace of many kitchens. It
 * reads like a branded storefront: hero, savings banner, Combos/Meals tabs, a
 * bulk-quote entry, and dish rows with add-to-cart. Workshops stay on their own
 * tab as "classes".
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock, MapPin, ShoppingCart, Star, Users } from 'lucide-react-native';

import {
  Button,
  IconButton,
  InfoBanner,
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

const HERO_HEIGHT = 180;
const TAB_ORDER = ['Combos', 'Meals'] as const;

export function SingleKitchenHome({ navigation }: CustomerStackScreen<'Home'>) {
  const { t } = useLanguage();
  const type = useType();
  const { getKitchen, showcaseSlug, business } = useStore();
  const cart = useCart();
  const [tab, setTab] = useState<string>(TAB_ORDER[0]);

  const kitchen = getKitchen(showcaseSlug);
  if (!kitchen) return null;

  const items = tab === 'Meals' ? kitchen.menu : kitchen.combos;

  return (
    <View style={styles.root}>
      <Screen scroll bottomInset={cart.count > 0 ? 96 : 16} style={styles.screen}>
        {/* Branded hero — the kitchen name doubles as the app's identity here. */}
        <Media fill={kitchen.image} style={styles.hero}>
          <View style={styles.heroTop}>
            <IconButton
              label={t.cart}
              variant="solid"
              onPress={() => navigation.navigate('Cart')}
              style={styles.cartButton}
            >
              <ShoppingCart size={20} color="#FFFFFF" strokeWidth={1.75} />
            </IconButton>
            {cart.count > 0 ? (
              <View style={styles.cartBadge} pointerEvents="none">
                <Text style={[type.body(11, 800), styles.cartBadgeText]}>{cart.count}</Text>
              </View>
            ) : null}
          </View>
          <LinearGradient colors={[...overlays.heroScrim]} style={styles.scrim}>
            <Text style={[type.display(26, 800), styles.heroTitle]} numberOfLines={1}>
              {kitchen.name}
            </Text>
            <View style={styles.heroMeta}>
              <Star size={13} color={palette.turmeric500} fill={palette.turmeric500} strokeWidth={1.75} />
              <Text style={[type.body(13, 600), styles.heroMetaText]}>
                {' '}
                {kitchen.rating} · {kitchen.cuisine} ·{' '}
              </Text>
              <MapPin size={13} color="rgba(255,248,240,0.9)" strokeWidth={1.75} />
              <Text style={[type.body(13, 600), styles.heroMetaText]}> {business.area}</Text>
            </View>
          </LinearGradient>
        </Media>

        <View style={styles.body}>
          <InfoBanner icon={<Clock size={16} color={palette.turmeric600} strokeWidth={1.75} />}>
            {t.save20}
          </InfoBanner>

          <Tabs tabs={[...TAB_ORDER]} active={tab} onChange={setTab} style={styles.tabs} />

          <Button
            variant="ghost"
            onPress={() => navigation.navigate('Bulk', { slug: kitchen.slug })}
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
                onAdd={(delta) => cart.add(kitchen.slug, dish.id, delta)}
              />
            ))}
          </View>
        </View>
      </Screen>

      {cart.count > 0 ? (
        <View style={styles.sticky}>
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
  screen: { paddingTop: 0 },
  hero: { height: HERO_HEIGHT, justifyContent: 'flex-end' },
  heroTop: { position: 'absolute', top: 12, right: 12 },
  cartButton: {},
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.actionAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: palette.cocoa900, lineHeight: 18 },
  scrim: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: layout.gutter },
  heroTitle: { color: '#FFFFFF' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  heroMetaText: { color: 'rgba(255,248,240,0.9)' },
  body: { padding: layout.gutter, gap: 12 },
  tabs: { marginTop: 2 },
  bulkRow: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'flex-start',
  },
  bulkText: { flex: 1, color: colors.textBrand },
  dishes: { gap: 10 },
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
  sticky: { position: 'absolute', left: layout.gutter, right: layout.gutter, bottom: 16 },
});
