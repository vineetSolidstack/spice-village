/**
 * Cart and checkout.
 *
 * Items, the saving, a pickup-slot picker, then a plain bill. Slot gating here
 * is UX only: `place_order()` re-checks capacity under a row lock and can still
 * reject, which is surfaced rather than swallowed.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock } from 'lucide-react-native';

import { Button, IconButton, Media, Stepper, VegDot, useToast } from '../../components';
import { colors, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { useAuth } from '../../state/auth';
import { money } from '../../lib/format';
import { canBook, remaining } from '../../lib/slotCode';
import { paymentsEnabled, createRazorpayOrder, releaseUnpaidOrder, type RazorpayOrder } from '../../lib/pay';
import { PaymentScreen } from './PaymentScreen';
import type { Slot } from '../../data/types';
import type { CustomerStackScreen } from '../../navigation/types';

export function CartScreen({ navigation }: CustomerStackScreen<'Cart'>) {
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { slots, placeOrder, getKitchen, business } = useStore();
  const { user } = useAuth();
  const cart = useCart();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  // Set while the Razorpay sheet is open, once the order is reserved.
  const [payment, setPayment] = useState<{ orderId: string; razorpay: RazorpayOrder } | null>(null);

  const kitchen = cart.kitchenSlug ? getKitchen(cart.kitchenSlug) : undefined;

  const finishSuccess = () => {
    cart.clear();
    showToast(`${t.orderPlaced} 🍛`, 'success');
    navigation.navigate('OrdersTab');
  };

  const onPlace = async () => {
    if (!selected || !cart.kitchenSlug || placing) return;
    setPlacing(true);

    // Reserve the slot first (creates the order; unpaid when payments are on).
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

    if (!result) {
      setPlacing(false);
      showToast('That slot just filled up. Pick another?', 'danger');
      setSelected(null);
      return;
    }

    // Pay-at-pickup (no gateway configured, or demo data): done here.
    if (!paymentsEnabled || !result.orderId) {
      setPlacing(false);
      finishSuccess();
      return;
    }

    // Online payment: ask the server to open a Razorpay order, then show checkout.
    const razorpay = await createRazorpayOrder(result.orderId);
    setPlacing(false);

    if (!razorpay) {
      // Couldn't start payment — release the slot we just reserved.
      await releaseUnpaidOrder(result.orderId);
      showToast('Could not start payment. Please try again.', 'danger');
      return;
    }
    setPayment({ orderId: result.orderId, razorpay });
  };

  const onPaymentCancelled = async (reason: string) => {
    const orderId = payment?.orderId;
    setPayment(null);
    if (orderId) await releaseUnpaidOrder(orderId);
    showToast(reason, 'danger');
  };

  if (cart.rows.length === 0) {
    return (
      <View style={styles.root}>
        <Header title={t.cart} onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍛</Text>
          <Text style={[type.display(20, 700), styles.emptyText]}>{t.emptyCart}</Text>
          <Button style={styles.emptyAction} onPress={() => navigation.navigate('Home')}>
            {t.home}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header title={t.cart} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {kitchen ? (
          <Text style={[type.body(13, 600), styles.kitchenLine]}>
            From <Text style={type.body(13, 800)}>{kitchen.name}</Text>
          </Text>
        ) : null}

        {/* ------------------------------------------------------- items */}
        <View style={styles.card}>
          {cart.rows.map((row, i) => (
            <View key={row.id} style={[styles.itemRow, i > 0 ? styles.itemDivider : null]}>
              <Media fill={row.image} style={styles.thumb} />
              <View style={styles.itemBody}>
                <View style={styles.itemName}>
                  <VegDot veg={row.veg} size={12} />
                  <Text style={[type.body(15, 700), styles.itemNameText]} numberOfLines={2}>
                    {row.name}
                  </Text>
                </View>
                <Text style={[type.body(14, 700), { color: colors.textBody }]}>
                  {money(row.price * row.quantity)}
                </Text>
              </View>
              <Stepper
                value={row.quantity}
                onChange={(next) => cart.add(cart.kitchenSlug!, row.id, next - row.quantity)}
                min={0}
              />
            </View>
          ))}
        </View>

        {cart.saved > 0 ? (
          <View style={styles.savings}>
            <Text style={[type.body(13, 700), { color: colors.statusSuccess }]}>
              You saved {money(cart.saved)} by pre-ordering 🌶️
            </Text>
          </View>
        ) : null}

        {/* -------------------------------------------------- pickup slot */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Clock size={18} color={colors.textBody} strokeWidth={2} />
            <Text style={type.display(19, 700)}>Pickup slot</Text>
          </View>
          {business.pickupWindow ? (
            <Text style={[type.body(13, 600), styles.sectionHint]}>
              Collect during {business.pickupWindow}
            </Text>
          ) : null}

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
            <Text style={[type.body(12, 600), styles.sectionHint]}>
              Pick a slot to place your order — caps keep the kitchen calm.
            </Text>
          ) : null}
        </View>

        {/* --------------------------------------------------------- bill */}
        <View style={styles.section}>
          <Text style={[type.display(19, 700), styles.billTitle]}>Bill</Text>
          <View style={styles.card}>
            <BillRow label={`Items (${cart.count})`} value={money(cart.total + cart.saved)} />
            {cart.saved > 0 ? (
              <BillRow label="Pre-order saving" value={`− ${money(cart.saved)}`} good />
            ) : null}
            <View style={styles.billTotal}>
              <Text style={type.body(16, 800)}>Total</Text>
              <Text style={type.body(16, 800)}>{money(cart.total)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ------------------------------------------------------ checkout */}
      <View style={[styles.footer, { paddingBottom: 16 + (insets.bottom ? 0 : 4) }]}>
        <Button block disabled={!selected || placing} onPress={() => void onPlace()}>
          {placing
            ? 'Please wait…'
            : paymentsEnabled
              ? `Pay ${money(cart.total)} · UPI`
              : `${t.placeOrder} · ${money(cart.total)}`}
        </Button>
      </View>

      {payment ? (
        <PaymentScreen
          open
          orderId={payment.orderId}
          razorpay={payment.razorpay}
          kitchenName={kitchen?.name ?? business.kitchenName}
          reference={`Order · ${cart.count} items`}
          customerName={user?.name}
          customerEmail={user?.email ?? undefined}
          customerPhone={business.phone || undefined}
          onPaid={() => {
            setPayment(null);
            finishSuccess();
          }}
          onCancelled={(reason) => void onPaymentCancelled(reason)}
        />
      ) : null}
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const type = useType();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <IconButton label="Back" onPress={onBack}>
        <ArrowLeft size={22} color={colors.textBody} strokeWidth={2} />
      </IconButton>
      <Text style={[type.display(22, 800), styles.headerTitle]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function BillRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  const type = useType();
  return (
    <View style={styles.billRow}>
      <Text style={[type.body(14, 600), { color: colors.textMuted }]}>{label}</Text>
      <Text style={[type.body(14, 700), good ? { color: colors.statusSuccess } : null]}>{value}</Text>
    </View>
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

  const detailColour = full ? colors.textFaint : left <= 3 ? colors.statusWarn : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: full, selected }}
      disabled={full}
      onPress={onPress}
      style={[
        styles.slot,
        selected
          ? { borderColor: palette.paprika600, backgroundColor: colors.surfaceBrandSoft }
          : { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard },
        full ? { backgroundColor: palette.cream200, borderColor: colors.borderSubtle } : null,
      ]}
    >
      <Text
        style={[
          type.body(15, 700),
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
  root: { flex: 1, backgroundColor: colors.surfacePage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
    backgroundColor: colors.surfaceCard,
  },
  headerTitle: { flex: 1 },
  scroll: { padding: layout.gutter, paddingBottom: 120, gap: 16 },
  kitchenLine: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingHorizontal: layout.cardPadding,
    ...shadow.card,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  itemBody: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemNameText: { flex: 1 },
  savings: {
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHint: { color: colors.textMuted },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 104,
  },
  billTitle: {},
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  billTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.gutter,
    paddingTop: 12,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { marginTop: 12, textAlign: 'center' },
  emptyAction: { marginTop: 20 },
});
