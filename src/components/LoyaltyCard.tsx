/**
 * Stamp-card loyalty widget for the customer.
 *
 * Shows a row of stamp slots (filled as they're earned) toward a free combo,
 * and a celebratory state when a reward is ready to redeem in the cart.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Gift } from 'lucide-react-native';

import { colors, radius, shadow } from '../theme';
import { useType } from '../theme/useType';
import type { Loyalty } from '../data/types';

export function LoyaltyCard({ loyalty }: { loyalty: Loyalty }) {
  const type = useType();
  const { stamps, rewards, goal } = loyalty;
  const hasReward = rewards > 0;
  const left = Math.max(0, goal - stamps);

  return (
    <View style={[styles.card, shadow.card, hasReward ? styles.cardReward : null]}>
      <View style={styles.head}>
        <Gift size={18} color={hasReward ? colors.textOnBrand : colors.textBrand} strokeWidth={2} />
        <Text style={[type.body(14, 800), hasReward ? styles.onBrand : null]}>
          {hasReward ? 'Free combo ready!' : 'Stamp card'}
        </Text>
        {rewards > 1 ? (
          <View style={styles.pill}>
            <Text style={[type.body(11, 800), styles.pillText]}>×{rewards}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stamps}>
        {Array.from({ length: goal }).map((_, i) => {
          const filled = i < stamps;
          return (
            <View key={i} style={[styles.slot, filled ? styles.slotFilled : null, hasReward ? styles.slotOnBrand : null]}>
              {filled ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
          );
        })}
      </View>

      <Text style={[type.body(12, 600), hasReward ? styles.onBrandSoft : styles.sub]}>
        {hasReward
          ? 'Pick your free combo in the cart at checkout.'
          : left === goal
            ? `Order ${goal} times to earn a free combo.`
            : `${left} more ${left === 1 ? 'order' : 'orders'} for a free combo.`}
      </Text>
    </View>
  );
}

const SLOT = 26;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  cardReward: { backgroundColor: colors.actionPrimary },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onBrand: { color: colors.textOnBrand },
  onBrandSoft: { color: 'rgba(255,255,255,0.92)' },
  sub: { color: colors.textMuted },
  pill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: { color: '#FFFFFF' },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: SLOT,
    height: SLOT,
    borderRadius: SLOT / 2,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  slotFilled: { backgroundColor: colors.actionPrimary, borderColor: colors.actionPrimary },
  slotOnBrand: { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.18)' },
});
