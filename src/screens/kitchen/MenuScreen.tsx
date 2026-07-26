/**
 * Menu management — availability switch (dims the row), edit and delete, plus
 * the add/edit item editor with a photo picker.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  Dialog,
  IconButton,
  Media,
  PortalHeader,
  Screen,
  Switch,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { money } from '../../lib/format';
import { blankDish, DishEditorSheet, type DishDraft } from './DishEditorSheet';
import type { Dish } from '../../data/types';

export function KitchenMenuScreen() {
  const type = useType();
  const { getKitchen, showcaseSlug, setDishAvailability, removeDish, saveDish, loading } = useStore();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState<Dish | null>(null);
  const [editing, setEditing] = useState<DishDraft | null>(null);

  const kitchen = getKitchen(showcaseSlug);
  // Never blank the screen: even before the kitchen loads, the owner can add
  // their first item. Saves target the showcase slug either way.
  const saveSlug = kitchen?.slug ?? showcaseSlug;

  const combos = (kitchen?.combos ?? []).map((d) => ({ dish: d, isCombo: true }));
  const meals = (kitchen?.menu ?? []).map((d) => ({ dish: d, isCombo: false }));
  const items = [...combos, ...meals];

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Menu"
        right={
          <Button
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => setEditing({ dish: blankDish(), isCombo: false })}
          >
            Add item
          </Button>
        }
      />

      <View style={styles.body}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[type.body(15, 700), { color: colors.textBody, marginBottom: 4 }]}>
              {loading ? 'Loading your menu…' : 'No items yet'}
            </Text>
            {!loading ? (
              <Text style={[type.body(13, 600), { color: colors.textMuted, textAlign: 'center' }]}>
                Tap “Add item” to put your first combo or dish on the menu. Set its
                units per day so today’s stock counts down as customers order.
              </Text>
            ) : null}
          </View>
        ) : null}

        {items.map(({ dish, isCombo }) => (
          <View
            key={dish.id}
            style={[styles.row, shadow.card, dish.available === false ? styles.dimmed : null]}
          >
            <Media fill={dish.image} style={styles.thumb} />

            <View style={styles.rowBody}>
              <Text style={type.body(14, 700)} numberOfLines={1}>
                {dish.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[type.body(13, 800), { color: colors.textBrand }]}>
                  {money(dish.price)}
                </Text>
                <Text style={[type.body(13, 600), styles.oldPrice]}>{money(dish.oldPrice)}</Text>
              </View>
            </View>

            <Switch
              checked={dish.available !== false}
              onChange={(value) => setDishAvailability(saveSlug, dish.id, value)}
            />

            <IconButton
              label={`Edit ${dish.name}`}
              size={34}
              onPress={() => setEditing({ dish, isCombo })}
            >
              <Pencil size={16} color={colors.textBrand} strokeWidth={2} />
            </IconButton>

            <IconButton label={`Delete ${dish.name}`} size={34} onPress={() => setConfirming(dish)}>
              <Trash2 size={16} color={colors.statusDanger} strokeWidth={2} />
            </IconButton>
          </View>
        ))}
      </View>

      <DishEditorSheet
        draft={editing}
        onClose={() => setEditing(null)}
        onSave={async (dish, isCombo, unitsChange) => {
          const creating = !dish.id;
          const ok = await saveDish(saveSlug, dish, isCombo, unitsChange);
          showToast(
            ok
              ? creating
                ? `${dish.name} added`
                : `${dish.name} saved`
              : 'Saved on your device, but the server rejected it — customers won’t see this. Check you’re signed in as the owner.',
            ok ? 'info' : 'danger',
          );
        }}
      />

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Remove item?"
        footer={
          <>
            <Button variant="ghost" onPress={() => setConfirming(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                if (confirming) {
                  removeDish(saveSlug, confirming.id);
                  showToast(`${confirming.name} removed`, 'info');
                }
                setConfirming(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
          {confirming?.name} will no longer appear on your storefront. Existing orders keep their
          original item details.
        </Text>
      </Dialog>
    </Screen>
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
    gap: 10,
  },
  dimmed: { opacity: 0.55 },
  empty: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  thumb: { width: 44, height: 44, borderRadius: 12 },
  rowBody: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oldPrice: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
