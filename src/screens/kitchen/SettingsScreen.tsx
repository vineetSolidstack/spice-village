/**
 * Kitchen settings — accepting-orders switch, profile fields, and the way back
 * to the customer app.
 */
import React, { useEffect, useState } from 'react';
import { Camera, FileText, ImagePlus, Ticket } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Input,
  Media,
  PortalHeader,
  Screen,
  Select,
  Switch,
  useToast,
} from '../../components';
import { photo as photoFill } from '../../components/Media';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { captureDishPhoto, pickDishPhoto, uploadDishPhoto } from '../../data/upload';
import { saveKitchenDetails } from '../../data/fetch';
import { CouponsSheet } from './CouponsSheet';
import { ReportsSheet } from './ReportsSheet';
import { useAuth } from '../../state/auth';

export function KitchenSettingsScreen() {
  const type = useType();
  const { acceptingOrders, setAcceptingOrders, backend, business, updateBusiness, categories, showcaseSlug, getKitchen, refresh } =
    useStore();
  const { setRole } = useAuth();
  const { showToast } = useToast();

  // Storefront cover photo (owner-uploaded).
  const currentCover = getKitchen(showcaseSlug)?.image;
  const [coverUrl, setCoverUrl] = useState<string | null>(
    currentCover?.kind === 'photo' ? currentCover.uri : null,
  );
  const [coverBusy, setCoverBusy] = useState(false);

  const uploadCover = async (take: boolean) => {
    const picked = take ? await captureDishPhoto() : await pickDishPhoto();
    if (!picked) return;
    setCoverUrl(picked.uri);
    if (backend !== 'supabase') return;
    setCoverBusy(true);
    const url = await uploadDishPhoto(showcaseSlug, 'cover', picked);
    if (url) {
      const ok = await saveKitchenDetails(showcaseSlug, { hero_image_path: url });
      setCoverUrl(url);
      setCoverBusy(false);
      if (ok) {
        void refresh();
        showToast('Cover photo updated', 'info');
      } else {
        showToast('Saved the photo but couldn’t update the kitchen — are you the owner?', 'danger');
      }
    } else {
      setCoverBusy(false);
      showToast('Cover upload was blocked — run storage_fix.sql and sign in as the owner.', 'danger');
    }
  };

  // Local draft, synced whenever the saved values change (e.g. edited in the
  // super admin's Business screen).
  const [name, setName] = useState(business.kitchenName);
  const [cuisine, setCuisine] = useState(business.cuisine);
  const [pickupWindow, setPickupWindow] = useState(business.pickupWindow);
  const [cutoff, setCutoff] = useState(business.orderCutoff);
  const [showCoupons, setShowCoupons] = useState(false);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    setName(business.kitchenName);
    setCuisine(business.cuisine);
    setPickupWindow(business.pickupWindow);
    setCutoff(business.orderCutoff);
  }, [business]);

  // Accept "7pm" / "19:00" / "7:30 pm" and normalise to 24h "HH:MM".
  const normaliseCutoff = (raw: string): string => {
    const s = raw.trim().toLowerCase();
    if (!s) return '';
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(s);
    if (!m) return business.orderCutoff; // keep the old value if unparseable
    let hh = Number(m[1]);
    const mm = m[2] ? Number(m[2]) : 0;
    const ap = m[3];
    if (ap === 'pm' && hh < 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    if (hh > 23 || mm > 59) return business.orderCutoff;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const onSave = () => {
    if (!name.trim()) return;
    updateBusiness({
      kitchenName: name.trim(),
      cuisine,
      pickupWindow: pickupWindow.trim(),
      orderCutoff: normaliseCutoff(cutoff),
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

        <Text style={[type.body(13, 700), styles.coverLabel]}>Storefront cover photo</Text>
        {coverUrl ? (
          <Media fill={photoFill(coverUrl)} style={styles.cover} />
        ) : (
          <View style={styles.coverEmpty}>
            <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
              Upload the photo customers see at the top of your storefront.
            </Text>
          </View>
        )}
        <View style={styles.coverButtons}>
          <Button
            size="sm"
            variant="secondary"
            icon={<ImagePlus size={16} color={colors.textBrand} strokeWidth={2} />}
            onPress={() => void uploadCover(false)}
          >
            {coverBusy ? 'Uploading…' : coverUrl ? 'Replace' : 'Upload'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Camera size={16} color={colors.textBrand} strokeWidth={2} />}
            onPress={() => void uploadCover(true)}
          >
            Camera
          </Button>
        </View>

        <Input label="Kitchen name" value={name} onChangeText={setName} />

        <Select label="Primary cuisine" options={categories} value={cuisine} onChange={setCuisine} />

        <Input
          label="Pickup window"
          value={pickupWindow}
          onChangeText={setPickupWindow}
          hint="Shown on every order"
        />

        <Input
          label="Pre-order cutoff"
          value={cutoff}
          onChangeText={setCutoff}
          placeholder="7pm"
          hint="After this time today’s pre-orders close and reopen tomorrow. Leave blank for no cutoff."
        />

        <Button disabled={!name.trim()} onPress={onSave}>Save changes</Button>

        <View style={styles.divider} />

        <Button
          variant="secondary"
          icon={<Ticket size={16} color={colors.textBrand} strokeWidth={2} />}
          onPress={() => setShowCoupons(true)}
        >
          Discount codes
        </Button>

        <Button
          variant="secondary"
          icon={<FileText size={16} color={colors.textBrand} strokeWidth={2} />}
          onPress={() => setShowReports(true)}
        >
          Sales report (PDF)
        </Button>

        <Text style={[type.body(12, 600), styles.backendNote]}>
          {backend === 'supabase'
            ? 'Live: reading and writing your Supabase data'
            : 'Preview: local demo data (connect Supabase to go live)'}
        </Text>

        <Button variant="secondary" block onPress={() => setRole('customer')}>
          Back to customer app
        </Button>
      </View>
      <CouponsSheet open={showCoupons} onClose={() => setShowCoupons(false)} />
      <ReportsSheet
        open={showReports}
        onClose={() => setShowReports(false)}
        kitchenSlug={showcaseSlug}
        kitchenName={business.kitchenName}
      />
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
  coverLabel: { marginBottom: -4 },
  cover: { height: 150, borderRadius: radius.md },
  coverEmpty: {
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  coverButtons: { flexDirection: 'row', gap: 8 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginTop: 6 },
  backendNote: { color: colors.textMuted },
});
