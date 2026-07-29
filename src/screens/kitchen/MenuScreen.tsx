/**
 * Menu management — availability switch (dims the row), edit and delete, plus
 * the add/edit item editor with a photo picker.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react-native';

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
  const { getKitchen, showcaseSlug, setDishAvailability, setDishHidden, moveDish, removeDish, saveDish, loading } =
    useStore();
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

        {items.map(({ dish, isCombo }) => {
          const group = isCombo ? kitchen?.combos ?? [] : kitchen?.menu ?? [];
          const gi = group.findIndex((d) => d.id === dish.id);
          const canUp = gi > 0;
          const canDown = gi >= 0 && gi < group.length - 1;
          return (
          <View
            key={dish.id}
            style={[
              styles.row,
              shadow.card,
              dish.available === false || dish.hidden ? styles.dimmed : null,
            ]}
          >
            <View style={styles.reorder}>
              <Pressable
                disabled={!canUp}
                onPress={() => moveDish(saveSlug, dish.id, isCombo, 'up')}
                hitSlop={6}
                accessibilityLabel={`Move ${dish.name} up`}
              >
                <ChevronUp size={16} color={canUp ? colors.textMuted : colors.borderSubtle} strokeWidth={2.5} />
              </Pressable>
              <Pressable
                disabled={!canDown}
                onPress={() => moveDish(saveSlug, dish.id, isCombo, 'down')}
                hitSlop={6}
                accessibilityLabel={`Move ${dish.name} down`}
              >
                <ChevronDown size={16} color={canDown ? colors.textMuted : colors.borderSubtle} strokeWidth={2.5} />
              </Pressable>
            </View>

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
              {dish.dailyUnits != null && !dish.hidden ? (
                <Text
                  style={[
                    type.body(11, 700),
                    { color: (dish.remainingToday ?? 0) <= 3 ? colors.statusWarn : colors.textMuted },
                  ]}
                >
                  {dish.remainingToday ?? dish.dailyUnits} / {dish.dailyUnits} left today
                </Text>
              ) : null}
              {dish.hidden ? (
                <Text style={[type.body(11, 700), { color: colors.statusDanger }]}>
                  Taken out · hidden from customers
                </Text>
              ) : null}
            </View>

            {/* Available switch is only meaningful while the item is visible. */}
            {!dish.hidden ? (
              <Switch
                checked={dish.available !== false}
                onChange={(value) => setDishAvailability(saveSlug, dish.id, value)}
              />
            ) : null}

            <IconButton
              label={dish.hidden ? `Put ${dish.name} back` : `Take ${dish.name} out`}
              size={34}
              onPress={() => setDishHidden(saveSlug, dish.id, !dish.hidden)}
            >
              {dish.hidden ? (
                <EyeOff size={16} color={colors.statusDanger} strokeWidth={2} />
              ) : (
                <Eye size={16} color={colors.textBrand} strokeWidth={2} />
              )}
            </IconButton>

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
          );
        })}
      </View>

      <DishEditorSheet
        draft={editing}
        onClose={() => setEditing(null)}
        onSave={async (dish, isCombo, unitsChange) => {
          const creating = !dish.id;
          const res = await saveDish(saveSlug, dish, isCombo, unitsChange);
          showToast(
            res.ok
              ? creating
                ? `${dish.name} added`
                : `${dish.name} saved`
              : `Server rejected it: ${res.error ?? 'unknown error'}`,
            res.ok ? 'info' : 'danger',
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
  reorder: { justifyContent: 'center', alignItems: 'center', marginLeft: -4 },
  empty: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  thumb: { width: 44, height: 44, borderRadius: 12 },
  rowBody: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oldPrice: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
