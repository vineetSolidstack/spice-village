/**
 * Kitchen storefront in the modern delivery-app format.
 *
 * Full-bleed hero with floating controls, a white sheet that overlaps it
 * carrying the kitchen's identity, a horizontal "Popular" strip, then sticky
 * category tabs over sectioned menu rows. Tapping a tab scrolls to its section;
 * scrolling moves the tab.
 *
 * Shared by the single-kitchen home and the marketplace storefront so both stay
 * identical — only the header controls differ.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Search, ShoppingCart, Star, Users } from 'lucide-react-native';

import { IconButton, Media, MenuCard, MenuRow, Button } from '../../components';
import { colors, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useFavourites } from '../../state/favourites';
import { useStore } from '../../data/store';
import { money } from '../../lib/format';
import type { Dish, Kitchen } from '../../data/types';

const HERO_HEIGHT = 248;
/** How far the white sheet rides up over the hero. */
const SHEET_OVERLAP = 24;
const POPULAR_COUNT = 6;

export type StorefrontProps = {
  kitchen: Kitchen;
  /** Quantities already in the cart, keyed by dish id. */
  cart: Record<string, number>;
  cartCount: number;
  onAdd: (dishId: string) => void;
  onOpenCart: () => void;
  /** Omitted when the kitchen has bulk ordering switched off. */
  onOpenBulk?: () => void;
  /** Shown on the marketplace storefront, hidden on the single-kitchen home. */
  onBack?: () => void;
  /** Pickup window, e.g. "5–7 pm". */
  pickupWindow?: string;
};

type Section = { title: string; dishes: Dish[] };

export function Storefront({
  kitchen,
  cart,
  cartCount,
  onAdd,
  onOpenCart,
  onOpenBulk,
  onBack,
  pickupWindow,
}: StorefrontProps) {
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const favourites = useFavourites();
  const { loading, refresh } = useStore();

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState<string>('');
  const [query, setQuery] = useState('');

  /**
   * Sections come from each dish's category, falling back to Combos/Meals so a
   * kitchen that never sets categories still gets a sensible menu.
   */
  const sections = useMemo<Section[]>(() => {
    const all = [...kitchen.combos, ...kitchen.menu];
    const q = query.trim().toLowerCase();
    const matching = q
      ? all.filter((d) => `${d.name} ${d.description}`.toLowerCase().includes(q))
      : all;

    if (q) return matching.length ? [{ title: 'Results', dishes: matching }] : [];

    const grouped = new Map<string, Dish[]>();
    for (const dish of matching) {
      const isCombo = kitchen.combos.some((c) => c.id === dish.id);
      const title = dish.category?.trim() || (isCombo ? 'Combos' : 'Meals');
      const list = grouped.get(title);
      if (list) list.push(dish);
      else grouped.set(title, [dish]);
    }
    const bySection = [...grouped.entries()].map(([title, dishes]) => ({ title, dishes }));
    // Favourited dishes surface in their own section at the top.
    const favs = matching.filter((d) => favourites.isFavourite(d.id));
    return favs.length ? [{ title: 'Your favourites', dishes: favs }, ...bySection] : bySection;
  }, [kitchen, query, favourites]);

  const popular = useMemo(
    () => [...kitchen.combos, ...kitchen.menu].filter((d) => d.available !== false).slice(0, POPULAR_COUNT),
    [kitchen],
  );

  const onSectionLayout = useCallback((title: string) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[title] = e.nativeEvent.layout.y;
  }, []);

  const jumpTo = (title: string) => {
    const y = sectionOffsets.current[title];
    if (y === undefined) return;
    setActiveSection(title);
    // Land just below the sticky tab bar rather than flush with the heading.
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 24;
    let current = '';
    for (const s of sections) {
      const offset = sectionOffsets.current[s.title];
      if (offset !== undefined && offset <= y) current = s.title;
    }
    if (current && current !== activeSection) setActiveSection(current);
  };

  const saving = popular.reduce((max, d) => Math.max(max, d.oldPrice - d.price), 0);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={32}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 110 : 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------- hero */}
        <View>
          <Media fill={kitchen.image} style={styles.hero} />
          {/* A soft scrim keeps the floating controls legible on any photo. */}
          <LinearGradient
            colors={['rgba(43,29,18,0.45)', 'transparent']}
            style={styles.heroTopScrim}
            pointerEvents="none"
          />

          <View style={[styles.heroControls, { top: insets.top + 8 }]}>
            {onBack ? (
              <IconButton label="Back" onPress={onBack} style={styles.floatingButton}>
                <ArrowLeft size={20} color={colors.textBody} strokeWidth={2} />
              </IconButton>
            ) : (
              <View />
            )}
            <View style={styles.heroActions}>
              <IconButton
                label="Search the menu"
                onPress={() => setQuery(query ? '' : ' ')}
                style={styles.floatingButton}
              >
                <Search size={20} color={colors.textBody} strokeWidth={2} />
              </IconButton>
              <View>
                <IconButton label={t.cart} onPress={onOpenCart} style={styles.floatingButton}>
                  <ShoppingCart size={20} color={colors.textBody} strokeWidth={2} />
                </IconButton>
                {cartCount > 0 ? (
                  <View style={styles.cartBadge} pointerEvents="none">
                    <Text style={[type.body(11, 800), styles.cartBadgeText]}>{cartCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ------------------------------------------------ identity sheet */}
          <View style={styles.sheet}>
            <Text style={type.display(28, 800)} numberOfLines={2}>
              {kitchen.name}
            </Text>

            <View style={styles.metaRow}>
              <Star size={15} color={palette.turmeric500} fill={palette.turmeric500} strokeWidth={2} />
              <Text style={[type.body(14, 700)]}>{kitchen.rating}</Text>
              <Text style={[type.body(14, 600), { color: colors.textMuted }]}>
                {' '}· {kitchen.cuisine}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                {' '}{kitchen.distance}
              </Text>
              {pickupWindow ? (
                <>
                  <Clock size={14} color={colors.textMuted} strokeWidth={2} style={styles.metaGap} />
                  <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                    {' '}Pickup {pickupWindow}
                  </Text>
                </>
              ) : null}
            </View>

            {saving > 0 ? (
              <View style={styles.savePill}>
                <Text style={[type.body(13, 700), { color: colors.statusSuccess }]}>
                  Save up to {money(saving)} by pre-ordering
                </Text>
              </View>
            ) : null}

            {onOpenBulk ? (
              <Pressable onPress={onOpenBulk} style={styles.bulkRow}>
                <Users size={18} color={colors.textBrand} strokeWidth={2} />
                <View style={styles.bulkText}>
                  <Text style={type.body(14, 700)}>Feeding a crowd?</Text>
                  <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                    Request a bulk quote for parties and offices
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {popular.length ? (
              <View style={styles.popular}>
                <Text style={[type.display(20, 700), styles.popularTitle]}>Popular</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularRow}
                >
                  {popular.map((dish, i) => (
                    <MenuCard
                      key={dish.id}
                      name={dish.name}
                      price={dish.price}
                      image={dish.image}
                      gallery={dish.gallery}
                      badge={i === 0 ? 'Most loved' : undefined}
                      quantity={cart[dish.id] ?? 0}
                      onAdd={() => onAdd(dish.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        {/* --------------------------------------------------- sticky tabs */}
        <View style={styles.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {sections.map((s) => {
              const active = s.title === activeSection;
              return (
                <Pressable
                  key={s.title}
                  onPress={() => jumpTo(s.title)}
                  style={[styles.tab, active ? styles.tabActive : null]}
                >
                  <Text
                    style={[
                      type.body(14, active ? 800 : 600),
                      { color: active ? colors.textOnBrand : colors.textMuted },
                    ]}
                  >
                    {s.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ------------------------------------------------------- sections */}
        <View style={styles.menu}>
          {sections.length === 0 ? (
            <Text style={[type.body(14, 600), styles.empty]}>
              Nothing on the menu matches that.
            </Text>
          ) : null}

          {sections.map((section) => (
            <View key={section.title} onLayout={onSectionLayout(section.title)}>
              <Text style={[type.display(22, 800), styles.sectionTitle]}>{section.title}</Text>
              {section.dishes.map((dish) => (
                <MenuRow
                  key={dish.id}
                  name={dish.name}
                  description={dish.description}
                  price={dish.price}
                  oldPrice={dish.oldPrice}
                  veg={dish.veg}
                  image={dish.image}
                  gallery={dish.gallery}
                  quantity={cart[dish.id] ?? 0}
                  available={dish.available !== false}
                  remaining={dish.remainingToday}
                  favourite={favourites.isFavourite(dish.id)}
                  onToggleFavourite={() => favourites.toggle(dish.id)}
                  onAdd={() => onAdd(dish.id)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <View style={[styles.sticky, { paddingBottom: insets.bottom ? 0 : 8 }]}>
          <Button block onPress={onOpenCart}>
            {`${t.viewCart} · ${cartCount}`}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCard },
  hero: { height: HERO_HEIGHT, width: '100%' },
  heroTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  heroControls: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActions: { flexDirection: 'row', gap: 10 },
  floatingButton: { backgroundColor: 'rgba(255,252,248,0.94)' },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', lineHeight: 18 },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: layout.gutter,
    paddingTop: 20,
    gap: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaGap: { marginLeft: 10 },
  savePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceBrandSoft,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  bulkText: { flex: 1 },
  popular: { marginTop: 18 },
  popularTitle: { marginBottom: 12 },
  popularRow: { gap: 12, paddingRight: layout.gutter },
  tabBar: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...Platform.select({ web: {}, default: shadow.card }),
  },
  tabRow: { gap: 8, paddingHorizontal: layout.gutter, paddingVertical: 12 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  tabActive: { backgroundColor: colors.actionPrimary },
  menu: { paddingHorizontal: layout.gutter },
  sectionTitle: { marginTop: 24, marginBottom: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 40 },
  sticky: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    bottom: 16,
  },
});
