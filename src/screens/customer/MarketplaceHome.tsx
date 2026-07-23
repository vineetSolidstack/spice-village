/**
 * Marketplace home — browse every approved kitchen.
 *
 * Only reachable when the super admin has switched the platform to marketplace
 * mode; in single mode the Home tab is the founder's own storefront instead.
 */
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Search, ShoppingCart, Star } from 'lucide-react-native';

import { IconButton, Input, Media, Tag } from '../../components';
import { colors, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { plural } from '../../lib/format';
import type { CustomerStackScreen } from '../../navigation/types';

export function MarketplaceHome({ navigation }: CustomerStackScreen<'Home'>) {
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { kitchens, categories, business, loading, refresh } = useStore();
  const { count } = useCart();

  const [cuisine, setCuisine] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = kitchens.filter((k) => {
    if (cuisine && k.cuisine !== cuisine) return false;
    if (!q) return true;
    // Match the kitchen, its cuisine, or any dish it serves.
    const haystack = [k.name, k.cuisine, ...k.menu.map((d) => d.name), ...k.combos.map((d) => d.name)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.greeting}>
            <Text style={type.display(26, 800)} numberOfLines={1}>
              {t.greet}
            </Text>
            <View style={styles.location}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                {' '}{business.area}
              </Text>
            </View>
          </View>

          <View>
            <IconButton label={t.cart} variant="tonal" onPress={() => navigation.navigate('Cart')}>
              <ShoppingCart size={20} color={colors.textBrand} strokeWidth={2} />
            </IconButton>
            {count > 0 ? (
              <View style={styles.cartBadge} pointerEvents="none">
                <Text style={[type.body(11, 800), styles.cartBadgeText]}>{count}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Input
          placeholder={t.search}
          icon={<Search size={18} color={colors.textMuted} strokeWidth={2} />}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((c) => (
            <Tag key={c} selected={cuisine === c} onPress={() => setCuisine(cuisine === c ? null : c)}>
              {c}
            </Tag>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
      >
        <Text style={[type.body(13, 700), styles.sectionLabel]}>
          {q || cuisine ? plural(visible.length, 'kitchen') : t.featured}
        </Text>

        {visible.length === 0 ? (
          <Text style={[type.body(14, 600), styles.empty]}>
            No kitchens match that — try another dish or cuisine.
          </Text>
        ) : null}

        {visible.map((k) => {
          const bestSaving = [...k.combos, ...k.menu].reduce(
            (max, d) => Math.max(max, d.oldPrice - d.price),
            0,
          );
          return (
            <Pressable
              key={k.slug}
              onPress={() => navigation.navigate('Kitchen', { slug: k.slug })}
              style={[styles.card, shadow.card]}
            >
              <Media fill={k.image} style={styles.cover} />
              <View style={styles.cardBody}>
                <Text style={type.display(20, 700)} numberOfLines={1}>
                  {k.name}
                </Text>
                <View style={styles.metaRow}>
                  <Star size={14} color={palette.turmeric500} fill={palette.turmeric500} strokeWidth={2} />
                  <Text style={[type.body(13, 700)]}> {k.rating}</Text>
                  <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                    {' '}· {k.cuisine} · {k.distance}
                  </Text>
                </View>
                {bestSaving > 0 ? (
                  <View style={styles.savePill}>
                    <Text style={[type.body(12, 700), { color: colors.statusSuccess }]}>
                      Save up to ₹{bestSaving} pre-ordering
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfacePage },
  header: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
    gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { flex: 1, paddingRight: 12 },
  location: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
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
  search: {},
  chipRow: { gap: 8, paddingBottom: 2 },
  scroll: { padding: layout.gutter, paddingBottom: 32, gap: 16 },
  sectionLabel: { color: colors.textMuted },
  card: { backgroundColor: colors.surfaceCard, borderRadius: radius.lg, overflow: 'hidden' },
  cover: { height: 150, width: '100%' },
  cardBody: { padding: layout.cardPadding, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  savePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 40 },
});
