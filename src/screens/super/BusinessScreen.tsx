/**
 * Business settings — the founder's control panel.
 *
 * Everything here is content that would otherwise be hardcoded: the brand
 * customers see, where it serves, when orders are handed over, and who teaches
 * the classes. Changes flow straight through to every portal.
 *
 * Menu and pickup slots live in the kitchen portal (Menu / Slots tabs) because
 * that's where they're used day to day; this screen links across to them.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  InfoBanner,
  Input,
  PortalHeader,
  Screen,
  SectionLabel,
  Select,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { useAuth } from '../../state/auth';

export function SuperBusinessScreen() {
  const type = useType();
  const { business, updateBusiness, categories, appMode } = useStore();
  const { setRole } = useAuth();
  const { showToast } = useToast();

  // Local draft so typing doesn't rewrite global state on every keystroke.
  const [draft, setDraft] = useState(business);
  useEffect(() => setDraft(business), [business]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = (Object.keys(draft) as (keyof typeof draft)[]).some((k) => draft[k] !== business[k]);
  const valid = draft.kitchenName.trim().length > 0;

  const onSave = () => {
    if (!valid) return;
    updateBusiness({
      kitchenName: draft.kitchenName.trim(),
      area: draft.area.trim(),
      cuisine: draft.cuisine,
      pickupWindow: draft.pickupWindow.trim(),
      instructorName: draft.instructorName.trim(),
      phone: draft.phone.trim(),
    });
    showToast('Business details saved', 'info');
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Business" />

      <View style={styles.body}>
        <InfoBanner weight={600}>
          These details appear across the customer app and both partner portals.
          {appMode === 'single' ? ' The brand name is what customers see as the app itself.' : ''}
        </InfoBanner>

        <View>
          <SectionLabel style={styles.groupLabel}>Brand</SectionLabel>
          <View style={[styles.card, shadow.card]}>
            <Input
              label="Kitchen name"
              placeholder="Nandhan Delight"
              value={draft.kitchenName}
              onChangeText={(v) => set('kitchenName', v)}
              error={draft.kitchenName.trim() ? undefined : 'Required'}
            />
            <Select
              label="Primary cuisine"
              options={categories}
              value={draft.cuisine}
              onChange={(v) => set('cuisine', v)}
            />
            <Input
              label="Service area"
              placeholder="T. Nagar, Chennai"
              hint="Shown under the greeting on the customer home screen"
              value={draft.area}
              onChangeText={(v) => set('area', v)}
            />
          </View>
        </View>

        <View>
          <SectionLabel style={styles.groupLabel}>Orders</SectionLabel>
          <View style={[styles.card, shadow.card]}>
            <Input
              label="Pickup window"
              placeholder="5–7 pm"
              hint="Shown on every order"
              value={draft.pickupWindow}
              onChangeText={(v) => set('pickupWindow', v)}
            />
            <Input
              label="Contact number"
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              hint="Used on bulk quote replies"
              value={draft.phone}
              onChangeText={(v) => set('phone', v)}
            />
            <Text style={[type.body(12, 600), styles.note]}>
              Individual pickup times and seat caps live in the kitchen portal under Slots.
            </Text>
          </View>
        </View>

        <View>
          <SectionLabel style={styles.groupLabel}>Classes</SectionLabel>
          <View style={[styles.card, shadow.card]}>
            <Input
              label="Host name"
              placeholder="Chef name shown on workshops"
              value={draft.instructorName}
              onChangeText={(v) => set('instructorName', v)}
            />
            <Text style={[type.body(12, 600), styles.note]}>
              Renaming updates every class you host. Class titles, prices, and sessions are edited
              in the instructor portal.
            </Text>
          </View>
        </View>

        <Button block disabled={!dirty || !valid} onPress={onSave}>
          {dirty ? 'Save changes' : 'Saved'}
        </Button>

        <View>
          <SectionLabel style={styles.groupLabel}>Edit elsewhere</SectionLabel>
          <View style={styles.jumpRow}>
            <Button variant="secondary" onPress={() => setRole('kitchen')}>
              Menu &amp; slots
            </Button>
            <Button variant="secondary" onPress={() => setRole('instructor')}>
              Classes
            </Button>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 14 },
  groupLabel: { marginBottom: 8 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 12,
  },
  note: { color: colors.textMuted },
  jumpRow: { flexDirection: 'row', gap: 10 },
});
