/**
 * Customer home — greeting, location, search, savings banner, cuisine filter
 * chips, and featured kitchen cards.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, MapPin, Search, ShoppingCart, Star } from 'lucide-react-native';

import { Badge, Card, IconButton, InfoBanner, Input, SectionLabel, Screen, Tag } from '../../components';
import { colors, layout, palette, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { CATEGORIES, DEMO_PROFILE } from '../../data/demo';
import type { CustomerStackScreen } from '../../navigation/types';

export function HomeScreen({ navigation }: CustomerStackScreen<'Home'>) {
  const { t } = useLanguage();
  const type = useType();
  const { kitchens } = useStore();
  const { count } = useCart();
  const [cuisine, setCuisine] = useState<string | null>(null);

  const visible = kitchens.filter((k) => !cuisine || k.cuisine === cuisine);

  return (
    <Screen bottomInset={16}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={type.display(26, 800)}>{t.greet}</Text>
          <View style={styles.location}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              {DEMO_PROFILE.customer.location}
            </Text>
          </View>
        </View>

        <View>
          <IconButton label={t.cart} variant="tonal" onPress={() => navigation.navigate('Cart')}>
            <ShoppingCart size={20} color={colors.textBrand} strokeWidth={1.75} />
          </IconButton>
          {count > 0 ? (
            <View style={styles.cartBadge} pointerEvents="none">
              <Text style={[type.body(11, 800), styles.cartBadgeText]}>{count}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.searchRow}>
        <Input
          placeholder={t.search}
          icon={<Search size={18} color={colors.textMuted} strokeWidth={1.75} />}
        />
      </View>

      <View style={styles.bannerRow}>
        <InfoBanner icon={<Clock size={16} color={palette.turmeric600} strokeWidth={1.75} />}>
          {t.save20}
        </InfoBanner>
      </View>

      <View style={styles.cuisines}>
        <SectionLabel style={styles.cuisineLabel}>{t.cats}</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((c) => (
            <Tag
              key={c}
              selected={cuisine === c}
              onPress={() => setCuisine(cuisine === c ? null : c)}
            >
              {c}
            </Tag>
          ))}
        </ScrollView>
      </View>

      <View style={styles.list}>
        <SectionLabel>{t.featured}</SectionLabel>
        {visible.map((k) => (
          <Card
            key={k.slug}
            image={k.image}
            imageHeight={120}
            onPress={() => navigation.navigate('Kitchen', { slug: k.slug })}
          >
            <View style={styles.cardHead}>
              <Text style={[type.display(17, 700), styles.cardTitle]} numberOfLines={1}>
                {k.name}
              </Text>
              {k.featured ? <Badge tone="accent">Featured</Badge> : null}
            </View>
            <View style={styles.meta}>
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                {k.cuisine} · {k.distance} ·{' '}
              </Text>
              <Star size={13} color={palette.turmeric500} fill={palette.turmeric500} strokeWidth={1.75} />
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}> {k.rating}</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: layout.gutter,
  },
  greeting: { flex: 1, paddingRight: 12 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
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
  searchRow: { paddingHorizontal: layout.gutter, paddingTop: 12, paddingBottom: 4 },
  bannerRow: { paddingHorizontal: layout.gutter, paddingVertical: 6 },
  cuisines: { paddingTop: 6 },
  cuisineLabel: { paddingHorizontal: layout.gutter, marginBottom: 8 },
  chipRow: { gap: 8, paddingHorizontal: layout.gutter, paddingBottom: 4 },
  list: { paddingHorizontal: layout.gutter, paddingTop: 10, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
