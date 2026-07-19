/**
 * Orders list — QR icon, kitchen, slot code · ref · items · when, status badge.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QrCode } from 'lucide-react-native';

import { Badge, PortalHeader, Screen } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { plural } from '../../lib/format';
import type { OrderStackScreen } from '../../navigation/types';

export function OrdersScreen({ navigation }: OrderStackScreen<'Orders'>) {
  const { t } = useLanguage();
  const type = useType();
  const { customerOrders } = useStore();

  return (
    <Screen bottomInset={16}>
      <PortalHeader title={t.yourOrders} />

      <View style={styles.list}>
        {customerOrders.length === 0 ? (
          <Text style={[type.body(14, 600), styles.empty]}>
            No orders yet — your first homemade meal is a tap away.
          </Text>
        ) : null}

        {customerOrders.map((order) => {
          const items = order.lines.reduce((sum, l) => sum + l.quantity, 0);
          return (
            <Pressable
              key={order.ref}
              accessibilityRole="button"
              onPress={() => navigation.navigate('OrderDetail', { ref: order.ref })}
              style={[styles.row, shadow.card]}
            >
              <QrCode size={24} color={colors.textBrand} strokeWidth={1.75} />
              <View style={styles.rowBody}>
                <Text style={type.body(15, 700)} numberOfLines={1}>
                  {order.kitchenName}
                </Text>
                <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
                  {order.slotCode} · {order.ref} · {plural(items, 'item')} · {order.when}
                </Text>
              </View>
              <Badge tone={order.status === 'Completed' ? 'neutral' : 'success'}>{order.status}</Badge>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 10 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 32 },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: { flex: 1 },
});
