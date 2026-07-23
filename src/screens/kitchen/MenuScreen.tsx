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
import { DEMO_PROFILE } from '../../data/demo';
import { money } from '../../lib/format';
import { blankDish, DishEditorSheet, type DishDraft } from './DishEditorSheet';
import type { Dish } from '../../data/types';

export function KitchenMenuScreen() {
  const type = useType();
  const { getKitchen, setDishAvailability, removeDish, saveDish } = useStore();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState<Dish | null>(null);
  const [editing, setEditing] = useState<DishDraft | null>(null);

  const kitchen = getKitchen(DEMO_PROFILE.kitchen.slug);
  if (!kitchen) return null;

  const combos = kitchen.combos.map((d) => ({ dish: d, isCombo: true }));
  const meals = kitchen.menu.map((d) => ({ dish: d, isCombo: false }));
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
              onChange={(value) => setDishAvailability(kitchen.slug, dish.id, value)}
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
        onSave={(dish, isCombo) => {
          const creating = !dish.id;
          saveDish(kitchen.slug, dish, isCombo);
          showToast(creating ? `${dish.name} added` : `${dish.name} saved`, 'info');
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
                  removeDish(kitchen.slug, confirming.id);
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
  thumb: { width: 44, height: 44, borderRadius: 12 },
  rowBody: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oldPrice: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
