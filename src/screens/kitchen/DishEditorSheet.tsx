/**
 * Create / edit a menu dish.
 *
 * Opens as the brand bottom sheet. A dish with a blank id is a new item; an
 * existing dish is edited in place. The photo picker draws from the bundled
 * food library (in production this would be a Supabase Storage upload).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, Check, ImagePlus } from 'lucide-react-native';

import { Button, Checkbox, Dialog, Input, Media, Switch, VegDot } from '../../components';
import { asset, photo as photoFill } from '../../components/Media';
import { captureDishPhoto, pickDishPhoto, uploadDishPhoto } from '../../data/upload';
import { useStore } from '../../data/store';
import { colors, palette, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { FOOD_IMAGES, FOOD_IMAGE_KEYS } from '../../data/images';
import type { Dish } from '../../data/types';

export type DishDraft = { dish: Dish; isCombo: boolean };

export type DishEditorSheetProps = {
  /** The dish being edited, a blank draft for "add", or null when closed. */
  draft: DishDraft | null;
  onClose: () => void;
  onSave: (dish: Dish, isCombo: boolean) => void;
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
    image: asset(FOOD_IMAGES[FOOD_IMAGE_KEYS[0]]),
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
  const [imageKey, setImageKey] = useState(FOOD_IMAGE_KEYS[0]);
  // A real uploaded photo wins over anything picked from the bundled library.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('');

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
    // Match the current image back to a library key if it is one of ours.
    const match = FOOD_IMAGE_KEYS.find((k) => FOOD_IMAGES[k] === (d.image as { source?: unknown }).source);
    setImageKey(match ?? FOOD_IMAGE_KEYS[0]);
    setUploadedUrl(d.image.kind === 'photo' ? d.image.uri : null);
    setCategory(d.category ?? '');
  }, [draft]);

  if (!draft) return null;

  const priceNum = parseInt(price, 10) || 0;
  const oldNum = parseInt(oldPrice, 10) || 0;
  const editing = Boolean(draft.dish.id);
  // Old price is the struck-through walk-in price, so it must be ≥ the offer price.
  const valid = name.trim().length > 0 && priceNum > 0 && oldNum >= priceNum;

  const onSubmit = () => {
    if (!valid) return;
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
        image: uploadedUrl ? photoFill(uploadedUrl) : asset(FOOD_IMAGES[imageKey]),
      },
      isCombo,
    );
    onClose();
  };

  const runUpload = async (take: boolean) => {
    const picked = take ? await captureDishPhoto() : await pickDishPhoto();
    if (!picked) return;
    // Show it straight away; swap in the hosted URL once it lands.
    setUploadedUrl(picked.uri);
    if (backend !== 'supabase') return;
    setUploading(true);
    const url = await uploadDishPhoto(showcaseSlug, draft.dish.id, picked);
    setUploading(false);
    if (url) setUploadedUrl(url);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Edit item' : 'Add item'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onPress={onSubmit}>
            {editing ? 'Save item' : 'Add item'}
          </Button>
        </>
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

        <Text style={[type.body(13, 700), styles.label]}>Photo</Text>

        <View style={styles.uploadRow}>
          <Button size="sm" variant="secondary" icon={<ImagePlus size={16} color={colors.textBrand} strokeWidth={2} />} onPress={() => void runUpload(false)}>
            {uploading ? 'Uploading…' : 'Upload photo'}
          </Button>
          <Button size="sm" variant="ghost" icon={<Camera size={16} color={colors.textBrand} strokeWidth={2} />} onPress={() => void runUpload(true)}>
            Camera
          </Button>
        </View>

        {uploadedUrl ? (
          <View style={styles.uploadPreview}>
            <Media fill={photoFill(uploadedUrl)} style={styles.uploadThumb} />
            <View style={styles.uploadText}>
              <Text style={type.body(13, 700)}>Your photo</Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                {backend === 'supabase' ? 'Shown to customers' : 'Connect Supabase to store it'}
              </Text>
            </View>
            <Button size="sm" variant="ghost" onPress={() => setUploadedUrl(null)}>
              Remove
            </Button>
          </View>
        ) : null}

        <Text style={[type.body(12, 600), styles.libraryHint]}>Or pick from the library</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {FOOD_IMAGE_KEYS.map((key) => {
            const selected = key === imageKey;
            return (
              <Pressable key={key} onPress={() => setImageKey(key)} accessibilityLabel={`Photo ${key}`}>
                <Media
                  fill={asset(FOOD_IMAGES[key])}
                  style={[styles.thumb, selected ? styles.thumbSelected : null]}
                >
                  {selected ? (
                    <View style={styles.thumbCheck}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Media>
              </Pressable>
            );
          })}
        </ScrollView>

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
  uploadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  uploadThumb: { width: 56, height: 44, borderRadius: 8 },
  uploadText: { flex: 1 },
  libraryHint: { color: colors.textMuted, marginBottom: 8 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'flex-end',
  },
  thumbSelected: { borderColor: palette.paprika600 },
  thumbCheck: {
    margin: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
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
