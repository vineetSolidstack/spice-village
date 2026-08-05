/**
 * Single-kitchen ("showcase") home.
 *
 * In single mode the Home tab *is* the founder's kitchen — no marketplace, no
 * browsing. It renders the shared storefront without a back button, so the
 * brand reads as the app itself.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { Storefront } from './Storefront';
import type { CustomerStackScreen } from '../../navigation/types';

export function SingleKitchenHome({ navigation }: CustomerStackScreen<'Home'>) {
  const { getKitchen, showcaseSlug, business, loading } = useStore();
  const cart = useCart();
  const type = useType();

  const kitchen = getKitchen(showcaseSlug);
  if (!kitchen) {
    return (
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color={colors.actionPrimary} />
        ) : (
          <Text style={[type.body(14, 600), { color: colors.textMuted, textAlign: 'center' }]}>
            {business.kitchenName} is getting set up.{'\n'}Please check back in a moment.
          </Text>
        )}
      </View>
    );
  }

  return (
    <Storefront
      kitchen={kitchen}
      cart={cart.items}
      cartCount={cart.count}
      pickupWindow={business.pickupWindow}
      onAdd={(dishId) => cart.add(kitchen.slug, dishId, 1)}
      onRemove={(dishId) => cart.add(kitchen.slug, dishId, -1)}
      onOpenCart={() => navigation.navigate('Cart')}
      // Hidden entirely when the owner has switched bulk ordering off.
      onOpenBulk={
        kitchen.bulkEnabled === false
          ? undefined
          : () => navigation.navigate('Bulk', { slug: kitchen.slug })
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.surfacePage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
});
