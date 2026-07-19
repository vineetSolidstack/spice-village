/**
 * Kitchen-side order row — slot-code chip, ref, customer, status badge, and the
 * button that advances the pipeline.
 *
 * Ready orders advance via a QR scan rather than a plain tap: staff scan the
 * customer's code, which is how the handover is verified.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, SlotCodeChip } from '../../components';
import { colors, displayFont, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { money } from '../../lib/format';
import { NEXT_STATUS, type Order, type OrderStatus } from '../../data/types';
import type { BadgeTone } from '../../components/Badge';

const TONE: Record<OrderStatus, BadgeTone> = {
  New: 'info',
  Preparing: 'warn',
  Ready: 'success',
  Completed: 'neutral',
};

export function OrderRow({
  order,
  onAdvance,
  onVerify,
}: {
  order: Order;
  onAdvance: (ref: string) => void;
  onVerify: (order: Order) => void;
}) {
  const type = useType();
  const next = NEXT_STATUS[order.status];

  const summary = order.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ');

  return (
    <View style={[styles.row, shadow.card]}>
      <View style={styles.head}>
        <SlotCodeChip code={order.slotCode} />
        <Text style={styles.ref}>{order.ref}</Text>
        <Text style={[type.body(13, 600), styles.who]} numberOfLines={1}>
          {order.customerName}
        </Text>
        <Badge tone={TONE[order.status]}>{order.status}</Badge>
      </View>

      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{summary}</Text>

      <View style={styles.foot}>
        <Text style={type.body(15, 800)}>{money(order.total)}</Text>
        {next ? (
          <Button
            size="sm"
            variant={order.status === 'Ready' ? 'primary' : 'secondary'}
            onPress={() => (order.status === 'Ready' ? onVerify(order) : onAdvance(order.ref))}
          >
            {order.status === 'Ready' ? 'Verify QR & complete' : `Mark ${next.toLowerCase()}`}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { fontFamily: displayFont(800), fontSize: 13, letterSpacing: 0.52, color: colors.textBody },
  who: { flex: 1, color: colors.textMuted },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
