/**
 * Dish photography upload.
 *
 * Owners pick a photo from the camera roll (or take one) and it goes to the
 * public `dish-photos` bucket, keyed `<kitchen-slug>/<dish-id>-<stamp>.jpg`.
 * Storage policies check that folder against the kitchens the caller owns, so
 * one owner cannot overwrite another's photos.
 *
 * Uploads go up as an ArrayBuffer rather than a Blob: React Native's Blob
 * implementation doesn't carry the bytes through supabase-js reliably, which
 * silently produces zero-byte objects.
 */
import * as ImagePicker from 'expo-image-picker';

import { requireSupabase } from './supabase';

export type PickedPhoto = { uri: string; width: number; height: number };

/** Ask for the library, then let the owner pick and crop a square-ish photo. */
export async function pickDishPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    // Menu thumbnails are small; heavy compression keeps uploads quick on a
    // phone tethered in a kitchen.
    quality: 0.7,
  });

  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** Take a photo with the camera instead of picking one. */
export async function captureDishPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });

  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Upload a picked photo and return its public URL.
 * Returns null on failure — callers keep the previous image rather than
 * blanking the dish.
 */
export async function uploadDishPhoto(
  kitchenSlug: string,
  dishId: string,
  photo: PickedPhoto,
): Promise<string | null> {
  try {
    const db = requireSupabase();

    const response = await fetch(photo.uri);
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) throw new Error('Picked photo was empty');

    // A fresh key each time sidesteps CDN caching of a replaced photo.
    const key = `${kitchenSlug}/${dishId || 'new'}-${Date.now()}.jpg`;

    const { error } = await db.storage.from('dish-photos').upload(key, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;

    const { data } = db.storage.from('dish-photos').getPublicUrl(key);
    return data.publicUrl ?? null;
  } catch (error) {
    console.warn('[spice-route] uploadDishPhoto failed', error);
    return null;
  }
}

/** Persist the photo URL against the dish row. */
export async function saveDishPhotoPath(dishId: string, url: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('dishes').update({ image_path: url }).eq('id', dishId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] saveDishPhotoPath failed', error);
    return false;
  }
}

/**
 * Upload a workshop cover photo. Keyed <user-id>/<file> so an instructor can
 * only write in their own folder. Returns the public URL, or null on failure.
 */
export async function uploadWorkshopPhoto(userId: string, photo: PickedPhoto): Promise<string | null> {
  try {
    const db = requireSupabase();
    const response = await fetch(photo.uri);
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) throw new Error('Picked photo was empty');

    const key = `${userId}/${Date.now()}.jpg`;
    const { error } = await db.storage.from('workshop-photos').upload(key, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;
    const { data } = db.storage.from('workshop-photos').getPublicUrl(key);
    return data.publicUrl ?? null;
  } catch (error) {
    console.warn('[spice-route] uploadWorkshopPhoto failed', error);
    return null;
  }
}
