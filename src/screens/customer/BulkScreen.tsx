/**
 * Bulk order — reached only from a kitchen page.
 *
 * Business rule #3: this flow deliberately bypasses the cart and pickup slots.
 * The customer states units, date, window and contact; the kitchen prices it by
 * hand. Nothing here consumes slot capacity and no slot code is issued.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AppBar,
  Button,
  InfoBanner,
  Input,
  Media,
  MiniCalendar,
  Screen,
  Select,
  Toast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { DEMO_PROFILE } from '../../data/demo';
import { money, plural, shortDate } from '../../lib/format';
import type { BulkLine } from '../../data/types';
import type { CustomerStackScreen } from '../../navigation/types';

const DELIVERY_WINDOWS = [
  'Breakfast · 8–9 am',
  'Lunch · 12–1 pm',
  'Evening · 5–6 pm',
  'Dinner · 7–8 pm',
];

export function BulkScreen({ navigation, route }: CustomerStackScreen<'Bulk'>) {
  const type = useType();
  const { getKitchen, submitBulkRequest } = useStore();

  const [units, setUnits] = useState<Record<string, string>>({});
  const [sides, setSides] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [window, setWindow] = useState(DELIVERY_WINDOWS[1]);
  const [sent, setSent] = useState(false);

  const kitchen = getKitchen(route.params.slug);

  const dishes = useMemo(() => (kitchen ? [...kitchen.combos, ...kitchen.menu] : []), [kitchen]);

  const lines: BulkLine[] = useMemo(
    () =>
      dishes
        .map((d) => ({ dish_id: d.id, dish_name: d.name, units: parseInt(units[d.id] ?? '', 10) || 0 }))
        .filter((l) => l.units > 0),
    [dishes, units],
  );

  const totalUnits = lines.reduce((sum, l) => sum + l.units, 0);

  if (!kitchen) return null;

  const canSubmit = totalUnits > 0 && date !== null;

  const onSubmit = () => {
    if (!canSubmit || !date) return;
    submitBulkRequest({
      kitchenSlug: kitchen.slug,
      customerName: DEMO_PROFILE.customer.name,
      contact,
      what: `${plural(totalUnits, 'unit')} · ${plural(lines.length, 'dish', 'dishes')}`,
      when: `Deliver ${shortDate(date)} · ${window}`,
      lines,
      deliveryDate: date.toISOString().slice(0, 10),
      deliveryWindow: window,
      sidesNote: sides || undefined,
    });
    setSent(true);
  };

  return (
    <Screen bottomInset={16}>
      <AppBar title={`Bulk order · ${kitchen.name}`} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        {sent ? (
          <View style={styles.sentState}>
            <Toast tone="success">{`Quote requested — ${kitchen.name} will call you back.`}</Toast>
            <Text style={[type.body(13, 600), styles.sentDetail]}>
              {plural(totalUnits, 'unit')} across {plural(lines.length, 'dish', 'dishes')} ·{' '}
              {date ? shortDate(date) : ''} · {window}. Bulk orders are priced by the kitchen — they
              don&apos;t use pickup slots.
            </Text>
            <Button variant="secondary" style={styles.sentAction} onPress={() => navigation.goBack()}>
              Back to kitchen
            </Button>
          </View>
        ) : (
          <>
            <InfoBanner weight={600}>
              For parties, offices &amp; events. Write units per dish — the kitchen reviews and sends a
              custom quote, no instant checkout.
            </InfoBanner>

            <View style={styles.dishes}>
              {dishes.map((dish) => (
                <View key={dish.id} style={[styles.dishRow, shadow.card]}>
                  <Media fill={dish.image} style={styles.thumb} />
                  <View style={styles.dishBody}>
                    <Text style={type.body(14, 700)} numberOfLines={1}>
                      {dish.name}
                    </Text>
                    <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
                      {money(dish.price)} retail · bulk price on quote
                    </Text>
                  </View>
                  <TextInput
                    accessibilityLabel={`Units of ${dish.name}`}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                    value={units[dish.id] ?? ''}
                    onChangeText={(v) =>
                      setUnits((current) => ({ ...current, [dish.id]: v.replace(/\D/g, '') }))
                    }
                    style={[type.body(15, 700), styles.unitsInput]}
                  />
                </View>
              ))}
            </View>

            <Input
              label="Sides / extras"
              placeholder="e.g. 3 sides, dessert, packaging notes"
              value={sides}
              onChangeText={setSides}
            />

            <View>
              <Text style={[type.body(13, 700), styles.fieldLabel]}>
                Delivery date
                {date ? <Text style={{ color: colors.textBrand }}> · {shortDate(date)}</Text> : null}
              </Text>
              <MiniCalendar value={date} onChange={setDate} />
            </View>

            <Select
              label="Delivery window"
              options={DELIVERY_WINDOWS}
              value={window}
              onChange={setWindow}
            />

            <Input
              label="Contact number"
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
            />

            <Button block disabled={!canSubmit} onPress={onSubmit}>
              {totalUnits > 0 ? `Request quote · ${plural(totalUnits, 'unit')}` : 'Request quote'}
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 14 },
  dishes: { gap: 8 },
  dishRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  dishBody: { flex: 1, minWidth: 0 },
  unitsInput: {
    width: 64,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: colors.textBody,
    backgroundColor: colors.surfaceCard,
  },
  fieldLabel: { marginBottom: 6 },
  sentState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12 },
  sentDetail: { color: colors.textMuted, marginTop: 14, textAlign: 'center' },
  sentAction: { marginTop: 18 },
});
