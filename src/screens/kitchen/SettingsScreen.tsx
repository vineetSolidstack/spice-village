/**
 * Kitchen settings — accepting-orders switch, profile fields, and the way back
 * to the customer app.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Input,
  PortalHeader,
  Screen,
  Select,
  Switch,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { useAuth } from '../../state/auth';

export function KitchenSettingsScreen() {
  const type = useType();
  const { acceptingOrders, setAcceptingOrders, backend, business, updateBusiness, categories } =
    useStore();
  const { setRole } = useAuth();
  const { showToast } = useToast();

  // Local draft, synced whenever the saved values change (e.g. edited in the
  // super admin's Business screen).
  const [name, setName] = useState(business.kitchenName);
  const [cuisine, setCuisine] = useState(business.cuisine);
  const [pickupWindow, setPickupWindow] = useState(business.pickupWindow);

  useEffect(() => {
    setName(business.kitchenName);
    setCuisine(business.cuisine);
    setPickupWindow(business.pickupWindow);
  }, [business]);

  const onSave = () => {
    if (!name.trim()) return;
    updateBusiness({
      kitchenName: name.trim(),
      cuisine,
      pickupWindow: pickupWindow.trim(),
    });
    showToast('Kitchen profile saved', 'info');
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Settings" />

      <View style={styles.body}>
        <View style={[styles.acceptCard, shadow.card]}>
          <View style={styles.acceptText}>
            <Text style={type.body(15, 700)}>Accepting orders</Text>
            <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
              Customers can pre-order while open
            </Text>
          </View>
          <Switch checked={acceptingOrders} onChange={setAcceptingOrders} />
        </View>

        <Input label="Kitchen name" value={name} onChangeText={setName} />

        <Select label="Primary cuisine" options={categories} value={cuisine} onChange={setCuisine} />

        <Input
          label="Pickup window"
          value={pickupWindow}
          onChangeText={setPickupWindow}
          hint="Shown on every order"
        />

        <Button disabled={!name.trim()} onPress={onSave}>Save changes</Button>

        <View style={styles.divider} />

        {/*
          Be precise here rather than flattering: with credentials set, orders
          and bookings are written to Supabase, but every screen still *reads*
          the bundled demo data until the fetch layer lands.
        */}
        <Text style={[type.body(12, 600), styles.backendNote]}>
          {backend === 'supabase'
            ? 'Supabase: writes only — screens still read bundled demo data'
            : 'Data source: local demo data'}
        </Text>

        <Button variant="secondary" block onPress={() => setRole('customer')}>
          Back to customer app
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 14 },
  acceptCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  acceptText: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginTop: 6 },
  backendNote: { color: colors.textMuted },
});
