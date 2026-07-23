/**
 * Bulk ordering — the owner's controls.
 *
 * The master switch removes the feature from the customer app entirely: no
 * entry row on the storefront, no screen, no way to submit. Switching it back
 * on restores it. Below that, the owner picks which dishes can be batch-cooked
 * and what each costs per unit in bulk.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Button,
  InfoBanner,
  Input,
  Media,
  PortalHeader,
  Screen,
  SectionLabel,
  Stepper,
  Switch,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { saveDishBulk } from '../../data/fetch';
import { money } from '../../lib/format';
import type { Dish } from '../../data/types';

export function KitchenBulkScreen() {
  const type = useType();
  const { getKitchen, showcaseSlug, setBulkSettings, saveDish, backend } = useStore();
  const { showToast } = useToast();

  const kitchen = getKitchen(showcaseSlug);

  const [enabled, setEnabled] = useState(kitchen?.bulkEnabled !== false);
  const [minUnits, setMinUnits] = useState(kitchen?.bulkMinUnits ?? 20);
  const [note, setNote] = useState(kitchen?.bulkNote ?? '');

  useEffect(() => {
    if (!kitchen) return;
    setEnabled(kitchen.bulkEnabled !== false);
    setMinUnits(kitchen.bulkMinUnits ?? 20);
    setNote(kitchen.bulkNote ?? '');
  }, [kitchen]);

  if (!kitchen) return null;

  const dishes = [...kitchen.combos, ...kitchen.menu];

  const onToggle = (value: boolean) => {
    setEnabled(value);
    setBulkSettings(kitchen.slug, { bulkEnabled: value });
    showToast(
      value ? 'Bulk ordering is live for customers' : 'Bulk ordering hidden from customers',
      'info',
    );
  };

  const onSave = () => {
    setBulkSettings(kitchen.slug, { bulkMinUnits: minUnits, bulkNote: note.trim() });
    showToast('Bulk settings saved', 'info');
  };

  const setDishBulk = (dish: Dish, patch: { bulkAvailable?: boolean; bulkPrice?: number }) => {
    const isCombo = kitchen.combos.some((c) => c.id === dish.id);
    saveDish(kitchen.slug, { ...dish, ...patch }, isCombo);
    if (backend === 'supabase') {
      void saveDishBulk(dish.id, {
        bulkAvailable: patch.bulkAvailable,
        bulkPrice: patch.bulkPrice ?? null,
      });
    }
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Bulk orders" />

      <View style={styles.body}>
        <View style={[styles.masterCard, shadow.card, enabled ? null : styles.masterOff]}>
          <View style={styles.masterHead}>
            <View style={styles.masterText}>
              <Text style={type.body(15, 700)}>Accept bulk orders</Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                {enabled
                  ? 'Customers can request quotes for parties and offices.'
                  : 'The feature is hidden — customers cannot see or request it.'}
              </Text>
            </View>
            <Switch checked={enabled} onChange={onToggle} />
          </View>
        </View>

        {enabled ? (
          <>
            <View>
              <SectionLabel style={styles.groupLabel}>How it works</SectionLabel>
              <View style={[styles.card, shadow.card]}>
                <View style={styles.minRow}>
                  <View style={styles.minText}>
                    <Text style={type.body(14, 700)}>Minimum units</Text>
                    <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                      Requests below this are not worth quoting
                    </Text>
                  </View>
                  <Stepper value={minUnits} onChange={setMinUnits} min={1} label="units" />
                </View>

                <Input
                  label="Note to customers"
                  placeholder="Parties, offices and events — we price each order by hand."
                  value={note}
                  onChangeText={setNote}
                  hint="Shown at the top of the bulk request form"
                />

                <Button block onPress={onSave}>
                  Save
                </Button>
              </View>
            </View>

            <View>
              <SectionLabel style={styles.groupLabel}>Dishes available in bulk</SectionLabel>
              <InfoBanner weight={600}>
                Switch off anything you cannot batch-cook. Set a per-unit bulk price, or leave it
                blank to quote by hand.
              </InfoBanner>

              <View style={styles.dishList}>
                {dishes.map((dish) => {
                  const bulkOn = dish.bulkAvailable !== false;
                  return (
                    <View
                      key={dish.id}
                      style={[styles.dishRow, shadow.card, bulkOn ? null : styles.dishOff]}
                    >
                      <Media fill={dish.image} style={styles.thumb} />
                      <View style={styles.dishBody}>
                        <Text style={type.body(14, 700)} numberOfLines={1}>
                          {dish.name}
                        </Text>
                        <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                          {money(dish.price)} retail
                        </Text>
                      </View>

                      {bulkOn ? (
                        <TextInput
                          accessibilityLabel={`Bulk price for ${dish.name}`}
                          keyboardType="number-pad"
                          placeholder="₹/unit"
                          placeholderTextColor={colors.textFaint}
                          defaultValue={dish.bulkPrice ? String(dish.bulkPrice) : ''}
                          onEndEditing={(e) => {
                            const raw = e.nativeEvent.text.replace(/\D/g, '');
                            setDishBulk(dish, { bulkPrice: raw ? parseInt(raw, 10) : undefined });
                          }}
                          style={[type.body(14, 700), styles.priceInput]}
                        />
                      ) : null}

                      <Switch
                        checked={bulkOn}
                        onChange={(value) => setDishBulk(dish, { bulkAvailable: value })}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <Text style={[type.body(13, 600), styles.offNote]}>
            Turn the switch back on whenever you want to take bulk orders again. Nothing is lost —
            your dish settings and past quotes stay as they are.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 14 },
  masterCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 2,
    borderColor: colors.actionPrimary,
  },
  masterOff: { borderColor: colors.borderSubtle },
  masterHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  masterText: { flex: 1 },
  groupLabel: { marginBottom: 8 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 14,
  },
  minRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  minText: { flex: 1 },
  dishList: { gap: 10, marginTop: 10 },
  dishRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dishOff: { opacity: 0.55 },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  dishBody: { flex: 1, minWidth: 0 },
  priceInput: {
    width: 74,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    color: colors.textBody,
  },
  offNote: { color: colors.textMuted },
});
