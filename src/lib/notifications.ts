/**
 * Push notifications.
 *
 * Registers the device with Expo, stores the token against the signed-in
 * profile, and shows notifications while the app is foregrounded. The sending
 * side lives in `supabase/notifications.sql`: a trigger on order status calls
 * Expo's push API, so a customer hears "your order is ready" the moment the
 * kitchen marks it, and the kitchen hears about a new order as it lands.
 *
 * Push only works in a real build — Expo Go cannot receive remote notifications
 * on a project it doesn't own.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { supabase, isSupabaseConfigured } from '../data/supabase';

// Foreground behaviour: still show the banner rather than swallowing it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission, get an Expo push token, and store it. Safe to call on every
 * sign-in: the token is the primary key, so re-registering just refreshes it.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  try {
    // Simulators and emulators have no push service.
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      // Android needs a channel before anything will show.
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C1440E',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('push_tokens')
        .upsert({ token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() });
    }

    return token;
  } catch (error) {
    console.warn('[spice-route] push registration failed', error);
    return null;
  }
}

/** Drop this device's token, e.g. on sign out, so it stops receiving alerts. */
export async function unregisterPush(): Promise<void> {
  try {
    if (!isSupabaseConfigured || !supabase || !Device.isDevice) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Best effort — a stale token simply stops being delivered to.
  }
}
