/**
 * Cart — item rows with steppers, the savings callout, and the pickup-slot
 * picker.
 *
 * Slot gating here is UX only: a slot whose remaining capacity is less than the
 * cart quantity renders disabled and "Full", but `place_order()` re-checks
 * capacity under a row lock and can still reject the order. That rejection is
 * surfaced rather than swallowed.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppBar,
  Button,
  Media,
  Screen,
  Stepper,
  VegDot,
  useToast,
} from '../../components';
import { colors, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { money } from '../../lib/format';
import { canBook, remaining } from '../../lib/slotCode';
import type { Slot } from '../../data/types';
import type { CustomerStackScreen } from '../../navigation/types';

export function CartScreen({ navigation }: CustomerStackScreen<'Cart'>) {
  const { t } = useLanguage();
  const type = useType();
  const { slots, placeOrder } = useStore();
  const cart = useCart();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const onPlace = async () => {
    if (!selected || !cart.kitchenSlug || placing) return;
    setPlacing(true);

    const result = await placeOrder({
      kitchenSlug: cart.kitchenSlug,
      slotDigits: selected,
      lines: cart.rows.map((r) => ({
        dishId: r.id,
        name: r.name,
        quantity: r.quantity,
        price: r.price,
      })),
    });

    setPlacing(false);

    if (!result) {
      // The server refused — almost always because the slot filled first.
      showToast('That slot just filled up. Pick another?', 'danger');
      setSelected(null);
      return;
    }

    cart.clear();
    showToast(`${t.orderPlaced} 🍛`, 'success');
    navigation.navigate('OrdersTab');
  };

  if (cart.rows.length === 0) {
    return (
      <Screen>
        <AppBar title={t.cart} onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍛</Text>
          <Text style={[type.display(18, 700), styles.emptyText]}>{t.emptyCart}</Text>
          <Button style={styles.emptyAction} onPress={() => navigation.navigate('Home')}>
            {t.home}
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomInset={16}>
      <AppBar title={t.cart} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        {cart.rows.map((row) => (
          <View key={row.id} style={[styles.row, shadow.card]}>
            <Media fill={row.image} style={styles.thumb} />
            <View style={styles.rowBody}>
              <View style={styles.rowName}>
                <VegDot veg={row.veg} />
                <Text style={[type.body(15, 700), styles.rowNameText]} numberOfLines={1}>
                  {row.name}
                </Text>
              </View>
              <Text style={[type.body(13, 800), { color: colors.textBrand }]}>{money(row.price)}</Text>
            </View>
            <Stepper
              value={row.quantity}
              onChange={(next) => cart.add(cart.kitchenSlug!, row.id, next - row.quantity)}
              min={0}
            />
          </View>
        ))}

        <View style={styles.savings}>
          <Text style={[type.body(13, 700), { color: colors.statusSuccess }]}>
            You saved {money(cart.saved)} by pre-ordering 🌶️
          </Text>
        </View>

        <View>
          <Text style={[type.body(13, 700), styles.slotLabel]}>Pickup slot</Text>
          <View style={styles.slotGrid}>
            {slots.map((slot) => (
              <SlotChip
                key={slot.digits}
                slot={slot}
                quantity={cart.count}
                selected={selected === slot.digits}
                onPress={() => setSelected(slot.digits)}
              />
            ))}
          </View>
          {!selected ? (
            <Text style={[type.body(12, 600), styles.slotHint]}>
              Pick a slot to place your order — caps keep the kitchen calm.
            </Text>
          ) : null}
        </View>

        <View style={styles.totalRow}>
          <Text style={type.body(17, 800)}>Total</Text>
          <Text style={type.body(17, 800)}>{money(cart.total)}</Text>
        </View>

        <Button block disabled={!selected || placing} onPress={onPlace}>
          {`${t.placeOrder} · ${money(cart.total)}`}
        </Button>
      </View>
    </Screen>
  );
}

function SlotChip({
  slot,
  quantity,
  selected,
  onPress,
}: {
  slot: Slot;
  quantity: number;
  selected: boolean;
  onPress: () => void;
}) {
  const type = useType();
  const left = remaining(slot);
  const full = !canBook(slot, quantity);

  const detailColour = full
    ? colors.textFaint
    : left <= 3
      ? colors.statusWarn
      : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: full, selected }}
      disabled={full}
      onPress={onPress}
      style={[
        styles.slot,
        selected
          ? { borderWidth: 2, borderColor: palette.paprika600, backgroundColor: colors.surfaceBrandSoft }
          : { borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard },
        full ? { backgroundColor: palette.cream200, borderColor: colors.borderSubtle } : null,
      ]}
    >
      <Text
        style={[
          type.body(13, 700),
          { color: full ? colors.textFaint : selected ? colors.textBrand : colors.textBody },
        ]}
      >
        {slot.time}
      </Text>
      <Text style={[type.body(11, 600), { color: detailColour }]}>
        {left === 0 ? 'Full' : full ? `Only ${left} left` : `${left} left`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 10 },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  rowBody: { flex: 1 },
  rowName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowNameText: { flex: 1 },
  savings: {
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  slotLabel: { marginTop: 4, marginBottom: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  slotHint: { color: colors.textMuted, marginTop: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { marginTop: 10, textAlign: 'center' },
  emptyAction: { marginTop: 18 },
});
