/**
 * Create / edit a menu dish.
 *
 * Opens as the brand bottom sheet. A dish with a blank id is a new item; an
 * existing dish is edited in place. The photo picker draws from the bundled
 * food library (in production this would be a Supabase Storage upload).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, Copy, ImagePlus, X } from 'lucide-react-native';

import { Button, Checkbox, Dialog, Input, Media, Switch, VegDot } from '../../components';
import { gradient, photo as photoFill } from '../../components/Media';
import { captureDishPhoto, pickDishPhoto, uploadDishPhoto } from '../../data/upload';
import { useStore } from '../../data/store';
import { colors, radius } from '../../theme';
import { useType } from '../../theme/useType';
import type { Dish } from '../../data/types';

export type DishDraft = { dish: Dish; isCombo: boolean };

export type DishEditorSheetProps = {
  /** The dish being edited, a blank draft for "add", or null when closed. */
  draft: DishDraft | null;
  onClose: () => void;
  onSave: (
    dish: Dish,
    isCombo: boolean,
    unitsChange?: { units: number | null; repeat: boolean } | null,
  ) => void;
};

/** A fresh dish with the first library photo, ready for the "Add item" flow. */
export function blankDish(): Dish {
  return {
    id: '',
    name: '',
    price: 0,
    oldPrice: 0,
    veg: true,
    description: '',
    image: gradient('#E8A33D', '#C1440E'),
    available: true,
  };
}

export function DishEditorSheet({ draft, onClose, onSave }: DishEditorSheetProps) {
  const type = useType();
  const { showcaseSlug, backend } = useStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [veg, setVeg] = useState(true);
  const [isCombo, setIsCombo] = useState(false);
  const [available, setAvailable] = useState(true);
  // Customers may pick this as their free stamp-card reward.
  const [rewardEligible, setRewardEligible] = useState(false);
  // Units made per day. Empty = no limit (unlimited). See item_stock.sql.
  const [units, setUnits] = useState('');
  // When changing an existing item's units, ask whether it's everyday or today.
  const [unitsPrompt, setUnitsPrompt] = useState(false);
  // Real uploaded photos win over the bundled library. Several can be added;
  // the customer app auto-swipes through them.
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Load the draft into the form each time the sheet opens.
  useEffect(() => {
    if (!draft) return;
    const d = draft.dish;
    setName(d.name);
    setDescription(d.description);
    setPrice(d.price ? String(d.price) : '');
    setOldPrice(d.oldPrice ? String(d.oldPrice) : '');
    setVeg(d.veg);
    setIsCombo(draft.isCombo);
    setAvailable(d.available !== false);
    setRewardEligible(d.rewardEligible === true);
    // Existing uploaded photos come back on the gallery as photo fills.
    const existing = (d.gallery ?? [d.image])
      .filter((m) => m.kind === 'photo')
      .map((m) => (m as { uri: string }).uri);
    setUploadedUrls(existing);
    setCategory(d.category ?? '');
    setUnits(d.dailyUnits != null ? String(d.dailyUnits) : '');
    setUnitsPrompt(false);
    setPhotoError(null);
  }, [draft]);

  if (!draft) return null;

  const priceNum = parseInt(price, 10) || 0;
  const oldNum = parseInt(oldPrice, 10) || 0;
  const editing = Boolean(draft.dish.id);
  // Old price is the struck-through walk-in price, so it must be ≥ the offer price.
  const valid = name.trim().length > 0 && priceNum > 0 && oldNum >= priceNum;

  // Parsed units: '' means "no limit" (null); otherwise a non-negative number.
  const unitsNum = units.trim() === '' ? null : parseInt(units, 10) || 0;
  const origUnits = draft.dish.dailyUnits ?? null;
  const unitsChanged = unitsNum !== origUnits;
  // Only ask "every day vs just today" when an existing, already-limited item's
  // number changes to another number — that's the only case where "just today"
  // is meaningful. First-time set, clearing, and new items just set the default.
  const needsSchedule = editing && unitsChanged && unitsNum != null && origUnits != null;

  const commit = (repeat: boolean) => {
    // Uploaded photos form the gallery; if none, a warm gradient placeholder.
    const gallery = uploadedUrls.length
      ? uploadedUrls.map((u) => photoFill(u))
      : [gradient('#E8A33D', '#C1440E')];
    const unitsChange = unitsChanged ? { units: unitsNum, repeat } : undefined;
    onSave(
      {
        ...draft.dish,
        category: category.trim() || undefined,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        oldPrice: oldNum,
        veg,
        available,
        rewardEligible,
        dailyUnits: unitsNum,
        image: gallery[0],
        gallery,
      },
      isCombo,
      unitsChange,
    );
    onClose();
  };

  const onSubmit = () => {
    if (!valid) return;
    // A file:// URL means an upload hasn't finished (or failed). Saving it would
    // show the photo only on this device, so block until it's hosted.
    if (backend === 'supabase' && uploadedUrls.some((u) => !/^https?:\/\//.test(u))) {
      setPhotoError('A photo is still uploading — wait a moment and try again.');
      return;
    }
    // Changing a running item's number? Ask everyday vs just-today first.
    if (needsSchedule) {
      setUnitsPrompt(true);
      return;
    }
    commit(true);
  };

  // Save the current form as a brand-new item ("… (copy)"), so building a menu
  // of similar combos is quick.
  const duplicate = () => {
    if (!valid) return;
    if (backend === 'supabase' && uploadedUrls.some((u) => !/^https?:\/\//.test(u))) {
      setPhotoError('A photo is still uploading — wait a moment and try again.');
      return;
    }
    const gallery = uploadedUrls.length
      ? uploadedUrls.map((u) => photoFill(u))
      : [gradient('#E8A33D', '#C1440E')];
    onSave(
      {
        ...draft.dish,
        id: '',
        category: category.trim() || undefined,
        name: `${name.trim()} (copy)`,
        description: description.trim(),
        price: priceNum,
        oldPrice: oldNum,
        veg,
        available,
        rewardEligible,
        hidden: false,
        dailyUnits: unitsNum,
        image: gallery[0],
        gallery,
      },
      isCombo,
      unitsNum != null ? { units: unitsNum, repeat: true } : undefined,
    );
    onClose();
  };

  const runUpload = async (take: boolean) => {
    const picked = take ? await captureDishPhoto() : await pickDishPhoto();
    if (!picked) return;
    // Show it immediately with its local uri; swap to the hosted URL once up.
    setUploadedUrls((current) => [...current, picked.uri]);
    if (backend !== 'supabase') return;
    setUploading(true);
    const url = await uploadDishPhoto(showcaseSlug, draft.dish.id, picked);
    setUploading(false);
    if (url) {
      setUploadedUrls((current) => current.map((u) => (u === picked.uri ? url : u)));
      setPhotoError(null);
    } else if (backend === 'supabase') {
      // Drop the failed local photo so it can't block the save — the item can
      // still be added without it, and they can retry once storage is fixed.
      setUploadedUrls((current) => current.filter((u) => u !== picked.uri));
      setPhotoError(
        'Photo upload was blocked. Run supabase/storage_fix.sql and make sure you’re signed in as the kitchen owner (or super-admin). You can still save the item without a photo for now.',
      );
    }
  };

  const removePhoto = (url: string) =>
    setUploadedUrls((current) => current.filter((u) => u !== url));

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Edit item' : 'Add item'}
      footer={
        unitsPrompt ? (
          <>
            <Button variant="ghost" onPress={() => setUnitsPrompt(false)}>
              Back
            </Button>
            <Button variant="secondary" onPress={() => commit(false)}>
              Just today
            </Button>
            <Button onPress={() => commit(true)}>Every day</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onPress={onClose}>
              Cancel
            </Button>
            {editing ? (
              <Button
                variant="secondary"
                disabled={!valid || uploading}
                icon={<Copy size={15} color={colors.textBrand} strokeWidth={2} />}
                onPress={duplicate}
              >
                Copy
              </Button>
            ) : null}
            <Button disabled={!valid || uploading} onPress={onSubmit}>
              {uploading ? 'Uploading…' : editing ? 'Save item' : 'Add item'}
            </Button>
          </>
        )
      }
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label="Name" placeholder="Ghee dosa (2 pc)" value={name} onChangeText={setName} />

        <Input
          label="Description"
          placeholder="Crisp, golden, brushed with homemade ghee"
          value={description}
          onChangeText={setDescription}
          style={styles.field}
        />

        <View style={styles.priceRow}>
          <Input
            label="Price (₹)"
            placeholder="90"
            keyboardType="number-pad"
            value={price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
            style={styles.priceField}
          />
          <Input
            label="Old price (₹)"
            placeholder="110"
            keyboardType="number-pad"
            value={oldPrice}
            onChangeText={(v) => setOldPrice(v.replace(/\D/g, ''))}
            error={oldNum > 0 && oldNum < priceNum ? 'Must be ≥ price' : undefined}
            style={styles.priceField}
          />
        </View>

        <Input
          label="Menu section"
          placeholder="Tiffin, Biryani, Desserts…"
          hint="Groups this dish on the storefront; blank uses Combos / Meals"
          value={category}
          onChangeText={setCategory}
          style={styles.field}
        />

        <Input
          label="Units per day"
          placeholder="e.g. 10 — blank for no limit"
          hint="How many you make today. Every item's units add up to the day's total; each sells out on its own."
          keyboardType="number-pad"
          value={units}
          onChangeText={(v) => setUnits(v.replace(/\D/g, ''))}
          style={styles.field}
        />

        {unitsPrompt ? (
          <View style={styles.schedulePrompt}>
            <Text style={[type.body(13, 800), { color: colors.textBrand, marginBottom: 4 }]}>
              Change {name.trim() || 'this item'} to {unitsNum} units…
            </Text>
            <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
              “Every day” makes {unitsNum} the new daily default. “Just today” keeps the old
              default and only changes today.
            </Text>
          </View>
        ) : null}

        <Text style={[type.body(13, 700), styles.label]}>Photos</Text>
        <Text style={[type.body(12, 600), styles.libraryHint]}>
          Add more than one and the app swipes through them automatically.
          {backend === 'supabase' ? '' : ' Connect Supabase to store uploads.'}
        </Text>

        <View style={styles.uploadRow}>
          <Button size="sm" variant="secondary" icon={<ImagePlus size={16} color={colors.textBrand} strokeWidth={2} />} onPress={() => void runUpload(false)}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <Button size="sm" variant="ghost" icon={<Camera size={16} color={colors.textBrand} strokeWidth={2} />} onPress={() => void runUpload(true)}>
            Camera
          </Button>
        </View>

        {photoError ? (
          <Text style={[type.body(12, 700), { color: colors.statusDanger }]}>{photoError}</Text>
        ) : null}

        {uploadedUrls.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {uploadedUrls.map((url, i) => (
              <View key={url} style={styles.uploadTile}>
                <Media fill={photoFill(url)} style={styles.uploadThumb} />
                {i === 0 ? (
                  <View style={styles.coverTag}>
                    <Text style={[type.body(10, 800), styles.coverTagText]}>COVER</Text>
                  </View>
                ) : null}
                <Pressable onPress={() => removePhoto(url)} style={styles.removeDot} accessibilityLabel="Remove photo">
                  <X size={12} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[type.body(12, 600), styles.libraryHint]}>
            No photo yet — upload your own picture of this dish.
          </Text>
        )}

        <View style={styles.toggles}>
          <Checkbox checked={veg} onChange={setVeg} label="Vegetarian" />
          <View style={styles.vegPreview}>
            <VegDot veg={veg} />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={type.body(14, 600)}>List under Combos</Text>
          <Switch checked={isCombo} onChange={setIsCombo} />
        </View>

        <View style={styles.switchRow}>
          <Text style={type.body(14, 600)}>Available</Text>
          <Switch checked={available} onChange={setAvailable} />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={type.body(14, 600)}>Free with stamps</Text>
            <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
              Customers can choose this as their free stamp-card reward
            </Text>
          </View>
          <Switch checked={rewardEligible} onChange={setRewardEligible} />
        </View>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 440 },
  field: { marginTop: 12 },
  label: { marginTop: 14, marginBottom: 8 },
  priceRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  priceField: { flex: 1 },
  photoRow: { gap: 8, paddingBottom: 4 },
  uploadRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  uploadTile: { width: 96, height: 74, marginRight: 8 },
  uploadThumb: { width: 96, height: 74, borderRadius: radius.md },
  coverTag: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(43,29,18,0.7)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  coverTagText: { color: '#FFFFFF', letterSpacing: 0.5 },
  removeDot: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.statusDanger,
    alignItems: 'center', justifyContent: 'center',
  },
  libraryHint: { color: colors.textMuted, marginBottom: 8 },
  schedulePrompt: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  toggles: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  vegPreview: { marginLeft: 'auto' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
});
