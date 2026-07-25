/**
 * Orders — a live card for anything still cooking, history below.
 */
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, QrCode, RotateCcw } from 'lucide-react-native';

import { Badge, Button, SlotCodeChip, useToast } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { useCart } from '../../state/cart';
import { money, plural } from '../../lib/format';
import type { Order } from '../../data/types';
import type { OrderStackScreen } from '../../navigation/types';
import type { BadgeTone } from '../../components/Badge';

const TONE: Record<Order['status'], BadgeTone> = {
  New: 'info',
  Preparing: 'warn',
  Ready: 'success',
  Completed: 'neutral',
};

export function OrdersScreen({ navigation }: OrderStackScreen<'Orders'>) {
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { customerOrders, loading, refresh } = useStore();
  const cart = useCart();
  const { showToast } = useToast();

  const active = customerOrders.filter((o) => o.status !== 'Completed');
  const past = customerOrders.filter((o) => o.status === 'Completed');

  const onReorder = (order: Order) => {
    const added = cart.reorder(
      order.kitchenSlug,
      order.lines.map((l) => ({ dishId: l.dishId, quantity: l.quantity })),
    );
    if (added === 0) {
      showToast('Those dishes aren’t available right now', 'danger');
      return;
    }
    if (added < order.lines.length) showToast('Some items were unavailable and skipped', 'info');
    navigation.navigate('HomeTab', { screen: 'Cart' });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={type.display(28, 800)}>{t.yourOrders}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
      >
        {customerOrders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={[type.body(15, 600), styles.emptyText]}>
              No orders yet — your first homemade meal is a tap away.
            </Text>
          </View>
        ) : null}

        {active.length ? (
          <>
            <Text style={[type.body(13, 700), styles.sectionLabel]}>Happening now</Text>
            {active.map((order) => (
              <ActiveCard
                key={order.ref}
                order={order}
                onPress={() => navigation.navigate('OrderDetail', { ref: order.ref })}
              />
            ))}
          </>
        ) : null}

        {past.length ? (
          <>
            <Text style={[type.body(13, 700), styles.sectionLabel]}>Past orders</Text>
            {past.map((order) => (
              <PastRow
                key={order.ref}
                order={order}
                onPress={() => navigation.navigate('OrderDetail', { ref: order.ref })}
                onReorder={() => onReorder(order)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** A live order leads with the slot code — it's what staff ask for. */
function ActiveCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const type = useType();
  const items = order.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Pressable onPress={onPress} style={[styles.activeCard, shadow.card]}>
      <View style={styles.activeHead}>
        <SlotCodeChip code={order.slotCode} size="md" />
        <Badge tone={TONE[order.status]}>{order.status}</Badge>
      </View>

      <Text style={[type.display(19, 700), styles.activeKitchen]} numberOfLines={1}>
        {order.kitchenName}
      </Text>
      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
        {plural(items, 'item')} · {money(order.total)} · {order.when}
      </Text>

      <View style={styles.activeFooter}>
        <QrCode size={18} color={colors.textBrand} strokeWidth={2} />
        <Text style={[type.body(13, 700), { color: colors.textBrand, flex: 1 }]}>
          Show your QR at pickup
        </Text>
        <ChevronRight size={18} color={colors.textBrand} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function PastRow({
  order,
  onPress,
  onReorder,
}: {
  order: Order;
  onPress: () => void;
  onReorder: () => void;
}) {
  const type = useType();
  const items = order.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <View style={[styles.pastRow, shadow.card]}>
      <Pressable onPress={onPress} style={styles.pastMain}>
        <View style={styles.pastBody}>
          <Text style={type.body(15, 700)} numberOfLines={1}>
            {order.kitchenName}
          </Text>
          <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
            {order.slotCode} · {plural(items, 'item')} · {order.when}
          </Text>
        </View>
        <Text style={type.body(14, 700)}>{money(order.total)}</Text>
      </Pressable>
      <Button
        size="sm"
        variant="secondary"
        icon={<RotateCcw size={15} color={colors.textBrand} strokeWidth={2} />}
        onPress={onReorder}
      >
        Reorder
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfacePage },
  header: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
    backgroundColor: colors.surfaceCard,
  },
  scroll: { padding: layout.gutter, paddingBottom: 32, gap: 10 },
  sectionLabel: { color: colors.textMuted, marginTop: 8 },
  activeCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 4,
  },
  activeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activeKitchen: {},
  activeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  pastRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pastMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pastBody: { flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
