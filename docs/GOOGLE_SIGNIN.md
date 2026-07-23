# Google Sign-In setup

One-tap Google login is built into the app but **hidden until you configure it**,
so no one meets a button that errors. Turning it on is three steps, all free.

## 1. Google Cloud — create an OAuth client

1. Go to <https://console.cloud.google.com> → create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** → External → fill in app name
   "Nandhan Delight", your support email, and save. Add yourself as a test user
   while you're testing.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web
   application.** Name it "Nandhan Delight web".
4. Under **Authorised redirect URIs**, add your Supabase callback:
   ```
   https://jfvitrmcyheesxrlhqan.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret**.

## 2. Supabase — enable the Google provider

1. Supabase dashboard → **Authentication → Providers → Google → enable.**
2. Paste the **Client ID** and **Client secret** from step 1. Save.
3. **Authentication → URL Configuration → Redirect URLs** → add the app's deep
   link so the browser can return to it:
   ```
   spiceroute://auth-callback
   ```

## 3. Turn the button on in the app

Set the flag as an EAS environment variable and rebuild:

```
eas env:create --scope project --name EXPO_PUBLIC_ENABLE_GOOGLE --value true \
  --type string --visibility plaintext \
  --environment production --environment preview --environment development
eas build --profile preview --platform android
```

(Ask and I'll run these for you once steps 1–2 are done.)

## How it behaves

- The sign-in page shows **Continue with Google** under the email form.
- Tapping it opens a Google tab, the customer picks their account, and the tab
  returns to the app signed in.
- The Supabase signup trigger creates their profile and grants the customer
  role automatically — same as email signup.

## Notes

- **Cost:** free. No per-login charge, no DLT registration (unlike phone OTP).
- **iOS later:** the same Supabase provider works; iOS needs the deep-link
  scheme in its build, which the app already declares.
- **Phone OTP** is a separate future step: it needs an SMS provider, per-message
  cost, and India's DLT template registration. Google covers most users without
  any of that.
