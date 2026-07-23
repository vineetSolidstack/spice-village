/**
 * Single-kitchen ("showcase") home.
 *
 * In single mode the Home tab *is* the founder's kitchen — no marketplace, no
 * browsing. It renders the shared storefront without a back button, so the
 * brand reads as the app itself.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { Storefront } from './Storefront';
import type { CustomerStackScreen } from '../../navigation/types';

export function SingleKitchenHome({ navigation }: CustomerStackScreen<'Home'>) {
  const { getKitchen, showcaseSlug, business } = useStore();
  const cart = useCart();

  const kitchen = getKitchen(showcaseSlug);
  if (!kitchen) return <View style={styles.root} />;

  return (
    <Storefront
      kitchen={kitchen}
      cart={cart.items}
      cartCount={cart.count}
      pickupWindow={business.pickupWindow}
      onAdd={(dishId) => cart.add(kitchen.slug, dishId, 1)}
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
  root: { flex: 1, backgroundColor: colors.surfacePage },
});
