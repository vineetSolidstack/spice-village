/**
 * Pickup slots — capacity management.
 *
 * The cap stepper's floor is the number already booked: lowering capacity below
 * `used` would strand orders the kitchen has already accepted.
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
  Stepper,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { remaining } from '../../lib/slotCode';
import type { Slot } from '../../data/types';

/** At or below this many covers left, the count turns turmeric. */
const LOW_REMAINING = 2;

export function KitchenSlotsScreen() {
  const { slots, setSlotCapacity, addSlot } = useStore();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('');

  const onAdd = () => {
    if (!time.trim()) return;
    addSlot(time.trim());
    setTime('');
    setAdding(false);
    showToast('Slot added', 'info');
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Pickup slots"
        right={
          <Button
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => setAdding(true)}
          >
            Add slot
          </Button>
        }
      />

      <View style={styles.body}>
        <InfoBanner weight={600}>
          Caps limit how many orders customers can book per slot — full slots close automatically at
          checkout.
        </InfoBanner>

        {slots.map((slot) => (
          <SlotRow key={slot.digits} slot={slot} onCapacity={setSlotCapacity} />
        ))}
      </View>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add pickup slot"
        footer={
          <>
            <Button variant="ghost" onPress={() => setAdding(false)}>
              Cancel
            </Button>
            <Button disabled={!time.trim()} onPress={onAdd}>
              Add slot
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

function SlotRow({
  slot,
  onCapacity,
}: {
  slot: Slot;
  onCapacity: (digits: string, capacity: number) => void;
}) {
  const type = useType();
  const left = remaining(slot);

  const countColour =
    left === 0 ? colors.statusDanger : left <= LOW_REMAINING ? colors.statusWarn : colors.textMuted;

  return (
    <View style={[styles.row, shadow.card]}>
      <SlotCodeChip code={slot.digits} size="md" />

      <View style={styles.rowBody}>
        <Text style={type.body(15, 700)}>{slot.time}</Text>
        <Text style={[type.body(12, 600), { color: countColour }]}>
          {slot.used}/{slot.capacity} booked · {left === 0 ? 'Full' : `${left} left`}
        </Text>
      </View>

      <Stepper
        value={slot.capacity}
        onChange={(next) => onCapacity(slot.digits, next)}
        // Capacity can never drop below what is already booked.
        min={slot.used}
        label="capacity"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 10 },
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
