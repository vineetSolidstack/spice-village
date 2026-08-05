/**
 * Kitchen dashboard — open/closed state, headline stats, and the orders that
 * need attention. Copy here is plain and functional: puns are customer-only.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, PortalHeader, Screen, SectionLabel, StatCard } from '../../components';
import { colors, layout } from '../../theme';
import { useStore } from '../../data/store';
import { fetchLoyaltyStats } from '../../data/fetch';
import { money } from '../../lib/format';
import { OrderRow } from './OrderRow';
import { VerifyQrSheet } from './VerifyQrSheet';
import type { Order } from '../../data/types';

/** How many "needs attention" rows the dashboard surfaces. */
const ATTENTION_LIMIT = 2;

export function KitchenDashboardScreen() {
  const { kitchenOrders, acceptingOrders, advanceOrder, verifySlotCode, business, dailyStock, slots, showcaseSlug, backend } =
    useStore();
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [loyalty, setLoyalty] = useState({ members: 0, rewardsOut: 0 });

  useEffect(() => {
    if (backend !== 'supabase') return;
    void fetchLoyaltyStats(showcaseSlug).then(setLoyalty);
  }, [backend, showcaseSlug, kitchenOrders.length]);

  const open = kitchenOrders.filter((o) => o.status !== 'Completed');
  const newCount = kitchenOrders.filter((o) => o.status === 'New').length;
  const preparingCount = kitchenOrders.filter((o) => o.status === 'Preparing').length;

  // Today at a glance: live counts from real orders + remaining units.
  const liveOrders = kitchenOrders.filter((o) => o.status !== 'Completed');
  const sales = kitchenOrders.reduce((sum, o) => sum + o.total, 0);
  const unitsLeft = Math.max(0, dailyStock.capacity - dailyStock.used);
  const nextPickup = slots.find((s) => s.used < s.capacity)?.time ?? slots[0]?.time ?? '—';

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title={business.kitchenName}
        right={
          <Badge tone={acceptingOrders ? 'success' : 'danger'}>
            {acceptingOrders ? 'Open' : 'Closed'}
          </Badge>
        }
      />

      <View style={styles.body}>
        <View style={styles.stats}>
          <StatCard label="New orders" value={newCount} tone={colors.statusInfo} />
          <StatCard label="Preparing" value={preparingCount} tone={colors.statusWarn} />
          <StatCard label="Today's sales" value={money(sales)} />
        </View>

        <SectionLabel style={styles.sectionLabel}>Today at a glance</SectionLabel>
        <View style={styles.stats}>
          <StatCard label="Live orders" value={liveOrders.length} />
          <StatCard label="Units left" value={unitsLeft} tone={unitsLeft <= 5 ? colors.statusWarn : undefined} />
          <StatCard label="Next pickup" value={nextPickup} />
        </View>

        <SectionLabel style={styles.sectionLabel}>Loyalty</SectionLabel>
        <View style={styles.stats}>
          <StatCard label="Stamp cards" value={loyalty.members} />
          <StatCard
            label="Free combos owed"
            value={loyalty.rewardsOut}
            tone={loyalty.rewardsOut > 0 ? colors.statusWarn : undefined}
          />
        </View>

        <SectionLabel style={styles.sectionLabel}>Needs attention</SectionLabel>

        {open.slice(0, ATTENTION_LIMIT).map((order) => (
          <OrderRow
            key={order.ref}
            order={order}
            onAdvance={advanceOrder}
            onVerify={setVerifying}
          />
        ))}
      </View>

      <VerifyQrSheet
        order={verifying}
        onClose={() => setVerifying(null)}
        onVerified={advanceOrder}
        resolve={verifySlotCode}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  sectionLabel: { marginTop: 4 },
});
