/**
 * Kitchen storefront reached from the marketplace — the same layout as the
 * single-kitchen home, plus a back button.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { Storefront } from './Storefront';
import type { CustomerStackScreen } from '../../navigation/types';

export function KitchenScreen({ navigation, route }: CustomerStackScreen<'Kitchen'>) {
  const { slug } = route.params;
  const { getKitchen, business } = useStore();
  const cart = useCart();

  const kitchen = getKitchen(slug);
  if (!kitchen) return <View style={styles.root} />;

  return (
    <Storefront
      kitchen={kitchen}
      cart={cart.items}
      cartCount={cart.count}
      pickupWindow={business.pickupWindow}
      onAdd={(dishId) => cart.add(kitchen.slug, dishId, 1)}
      onOpenCart={() => navigation.navigate('Cart')}
      onBack={() => navigation.goBack()}
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
