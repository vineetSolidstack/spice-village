# Push notifications setup (Android)

The app already does everything in code: it registers each signed-in phone for
push and stores the token, and "Send message" posts to Expo's push service,
which delivers to every customer — even with the app closed.

Two things must be true for a notification to actually arrive:

1. **A real phone** (not the emulator). Push tokens are never issued on an
   emulator, so a customer must install the APK on a physical Android phone and
   sign in (which asks for notification permission and registers the token).
2. **Firebase Cloud Messaging (FCM) configured**, because Android push is
   delivered *through* Firebase. This is the setup below — do it once.

App package name (needed by Firebase): **`com.spiceroute.app`**

---

## 1. Create a Firebase project + Android app

1. <https://console.firebase.google.com> → **Add project** → name it "Nandhan
   Delight" → create (Analytics optional).
2. In the project, click **Add app → Android**.
3. **Android package name:** `com.spiceroute.app` (must match exactly).
4. Register → **Download `google-services.json`**.

## 2. Put google-services.json in the app

1. Copy `google-services.json` into the project root (next to `app.json`).
2. In `app.json`, under `"android"`, add:
   ```json
   "googleServicesFile": "./google-services.json"
   ```
   (Ask and I'll add this line for you once the file is in the repo.)

## 3. Give Expo permission to send through FCM (FCM V1)

Expo's push service needs a key to talk to your Firebase project:

1. Firebase Console → **Project settings** (gear) → **Service accounts** →
   **Generate new private key** → downloads a JSON file.
2. Upload it to Expo, either:
   - **CLI:** `eas credentials` → Android → **Push Notifications: FCM V1** →
     *Upload a service account key* → pick the JSON, **or**
   - **Dashboard:** expo.dev → your project → **Credentials → Android → FCM V1**
     → upload the same JSON.

## 4. Rebuild

```
eas build --profile preview --platform android
```
(The google-services.json must be present for this build.)

## 5. Test on a real phone

1. Install the new APK on a **physical Android phone**.
2. Sign in → allow notifications when asked (this registers the push token).
3. From the owner portal → **Messages → New → Send**.
4. The phone gets the notification, even with the app closed.

## Checklist if it still doesn't arrive

- Confirm a row exists: `select * from push_tokens;` (should have the phone's
  token after it signed in on a real device).
- Confirm `supabase/notifications.sql` and `supabase/campaigns.sql` were run
  (they enable `pg_net` and the `send_campaign` function).
- The account you send to must have signed in on a real phone at least once.
- iOS needs a separate APNs key (Apple Developer account) — Android first.
