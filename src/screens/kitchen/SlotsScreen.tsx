/**
 * Pickup slots + today's stock.
 *
 * Units are set per item in the Menu now (see item_stock.sql). This screen
 * shows the day's TOTAL — the sum of every item's units — and the pickup TIMES
 * customers can choose. Every time shares the same running total; when the last
 * item sells out the total hits zero and all times close.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import {
  Button,
  Dialog,
  InfoBanner,
  Input,
  PortalHeader,
  Screen,
  SlotCodeChip,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import type { Slot } from '../../data/types';

export function KitchenSlotsScreen() {
  const type = useType();
  const { slots, addSlot, dailyStock } = useStore();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('');

  const left = Math.max(0, dailyStock.capacity - dailyStock.used);

  const onAdd = () => {
    if (!time.trim()) return;
    addSlot(time.trim());
    setTime('');
    setAdding(false);
    showToast('Pickup time added', 'info');
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Today’s stock" />

      <View style={styles.body}>
        <InfoBanner weight={600}>
          Units are set on each item in the Menu. This is today’s total across
          every item — when it runs out, all pickup times close automatically.
        </InfoBanner>

        {/* -------------------------------------------- the day's total */}
        <View style={[styles.poolCard, shadow.card]}>
          <View style={styles.poolTop}>
            <View>
              <Text style={type.display(30, 800)}>{left}</Text>
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                units left of {dailyStock.capacity} today
              </Text>
            </View>
          </View>

          {/* A simple progress bar of used vs total. */}
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                { width: `${dailyStock.capacity ? (dailyStock.used / dailyStock.capacity) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
            {dailyStock.used} booked so far today · set each item’s units in Menu
          </Text>
        </View>

        {/* -------------------------------------------- pickup times */}
        <View style={styles.timesHead}>
          <Text style={type.display(18, 700)}>Pickup times</Text>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={16} color={colors.textBrand} strokeWidth={2} />}
            onPress={() => setAdding(true)}
          >
            Add time
          </Button>
        </View>

        {slots.map((slot) => (
          <TimeRow key={slot.digits} slot={slot} left={left} />
        ))}
      </View>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add pickup time"
        footer={
          <>
            <Button variant="ghost" onPress={() => setAdding(false)}>
              Cancel
            </Button>
            <Button disabled={!time.trim()} onPress={onAdd}>
              Add
            </Button>
          </>
        }
      >
        <Input
          label="Pickup time"
          placeholder="6:15 pm"
          hint="The slot code is generated from this time — 6:15 pm becomes 615."
          value={time}
          onChangeText={setTime}
        />
      </Dialog>
    </Screen>
  );
}

/** A pickup time. Remaining is the shared pool, identical across every row. */
function TimeRow({ slot, left }: { slot: Slot; left: number }) {
  const type = useType();
  const countColour = left === 0 ? colors.statusDanger : left <= 5 ? colors.statusWarn : colors.textMuted;

  return (
    <View style={[styles.row, shadow.card]}>
      <SlotCodeChip code={slot.digits} size="md" />
      <View style={styles.rowBody}>
        <Text style={type.body(15, 700)}>{slot.time}</Text>
        <Text style={[type.body(12, 600), { color: countColour }]}>
          {left === 0 ? 'Sold out' : `${left} units left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 12 },
  poolCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 12,
  },
  poolTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  poolStepper: { alignItems: 'flex-end', gap: 6 },
  poolLabel: { color: colors.textMuted },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.actionPrimary },
  timesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
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
