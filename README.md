# Spice Route

A two-sided marketplace for homemade meals and cooking workshops, built as a
native app with React Native (Expo) and backed by Supabase.

Customers pre-order from approved home kitchens (saving up to 20%) and book
workshops; kitchen owners manage menus, pickup slots and orders; instructors run
workshops; a super admin approves and curates.

Built from the design handoff in [`design_handoff_spice_route_app/`](design_handoff_spice_route_app/).
Those `.jsx` files are **design references, not source** — every colour, radius,
spacing and font value in them was ported into the RN codebase below. They are
excluded from the bundle and from typechecking.

## Running it

```bash
npm install
npm start          # then press a / i, or scan the QR with Expo Go
npm run web        # browser preview — useful when you have no emulator
npm run typecheck
```

**It runs with no configuration.** Without Supabase credentials the app serves
the demo dataset in [src/data/demo.ts](src/data/demo.ts), so every screen is
reachable immediately.

## Deploying with Expo / EAS

Everything below needs an Expo account — log in once, then the commands work as
written.

```bash
npx eas login          # or: export EXPO_TOKEN=…   (Expo dashboard → Access tokens)
npx eas init           # creates the EAS project, writes extra.eas.projectId
```

Then pick a lane:

| Goal | Command | Notes |
| --- | --- | --- |
| See it on your phone, no build | `npm run tunnel` | Open the QR in **Expo Go**. No account needed. |
| Shareable test build | `npm run build:preview` | Android APK + iOS simulator build, ~10–20 min in the cloud. |
| Store-ready build | `npm run build:production` | Android App Bundle; iOS needs an Apple Developer account. |
| Ship a JS-only change | `npm run update` | Over-the-air via `expo-updates`, no rebuild. |

Build profiles are in [eas.json](eas.json). `preview` produces an installable APK
for internal distribution; `production` produces an app bundle for Play.

Note that `expo start --tunnel` and Expo Go are enough to see every screen,
because the app runs on demo data with no backend configured. The camera-based
QR verification is the one flow that needs a real device rather than a simulator.

## Connecting Supabase

```bash
cp .env.example .env     # fill in your project URL and anon key
```

Then apply the SQL, in order:

| File | What it does |
| --- | --- |
| [supabase/schema.sql](supabase/schema.sql) | Tables, enums, constraints |
| [supabase/functions.sql](supabase/functions.sql) | `place_order`, `verify_slot_code`, `book_workshop`, … |
| [supabase/policies.sql](supabase/policies.sql) | Row-level security, deny-by-default |
| [supabase/seed.sql](supabase/seed.sql) | Demo content matching `src/data/demo.ts` |

Once `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set,
[src/data/store.tsx](src/data/store.tsx) routes the rule-carrying mutations
through the RPCs instead of its local reducer. Nothing else changes.

## The business rules

These are the founder's core requirements, and where each one lives:

**1. Slot capacity.** Kitchens define pickup slots with caps. The cart disables
a slot whose remaining capacity is below the cart quantity — but that is UX
gating only. [`place_order()`](supabase/functions.sql) takes a row lock on the
slot, re-checks capacity, and rejects if it no longer fits. A rejection surfaces
to the customer as "that slot just filled up" rather than a fabricated success.

**2. Slot-sequence codes.** Every order gets `slotDigits-seq` — the 7th order in
the 5:00 pm slot is `500-07`. It is shown large on the customer's order screen
and as a dark chip on every kitchen-side row so staff can sort covers by eye.
**The QR payload is exactly this code**; scanning yields `500-07` and
`verify_slot_code()` resolves it, scoped to the scanning kitchen and today's
date. See [src/lib/slotCode.ts](src/lib/slotCode.ts).

Cancelling an order returns capacity to the slot but deliberately does *not* roll
back `last_sequence` — codes are already in customers' hands and must never be
reissued.

**3. Bulk orders** bypass cart and slots entirely. The customer states units,
date, window and contact; the kitchen prices it by hand. No capacity is consumed
and no slot code is issued. See [BulkScreen](src/screens/customer/BulkScreen.tsx).

**4. Puns are customer-facing only.** Kitchen, instructor and super-admin
surfaces use plain functional copy.

## Layout

```
src/
  theme/        Design tokens ported from tokens/*.css, plus script-aware type
  components/   The 15 core components, per the handoff's .d.ts contracts
  screens/      customer · kitchen · instructor · super
  navigation/   Tab shells, custom TabBar, role-switching root
  data/         Types, demo dataset, store, Supabase client + RPC calls
  state/        Cart, active role
  i18n/         English (default) · Tamil · Hindi
supabase/       Schema, functions, RLS policies, seed
```

All four portals ship in one binary; switch between them from **Profile →
Become a partner**, and back via each portal's last tab.

## Trilingual

English is the default, with Tamil and Hindi switchable in Profile and persisted
to AsyncStorage. Because React Native has no per-glyph font fallback, the active
language also selects the font: Baloo 2 / Nunito for Latin and Devanagari, Baloo
Thambi 2 / Mukta Malar for Tamil. Use `useType()` rather than the raw token
helpers so this happens automatically.

## What's verified, and what isn't

- Typechecks clean under `strict`, and bundles for both iOS and Android.
- The slot-code and capacity logic is covered by tests exercising the handoff's
  own example (5:00 pm, 7th order → `500-07`), padding, malformed-code
  rejection, and full/empty slot edges.
- **Not yet run on a device or emulator** — this was built in a container with
  no simulator, so the visual result has not been eyeballed. Bundling proves it
  compiles, not that it looks right.
- **The Supabase path has not been executed against a live project.** The SQL and
  client calls are written but untested; expect to shake out details on first
  connect.
- Food imagery is gradient placeholders throughout, as in the prototypes. There
  is no logo — "Spice Route" is set in Baloo 2 wherever a mark would go.

## Imagery

Real dish photos are bundled under [assets/food/](assets/food/) — 24 Indian and
pan-Asian plates sourced from [TheMealDB](https://www.themealdb.com)'s free
catalogue — mapped onto kitchens, dishes, and workshops via
[src/data/images.ts](src/data/images.ts). A warm gradient still stands in for the
handful of items with no matching photo (filter coffee, gajar halwa). These are
**demo assets**: in production each kitchen uploads its own photography to
Supabase Storage, and `Media` already accepts a remote `photo(uri)` fill for that.

## Editors and tools

- **Kitchen → Menu**: add / edit / delete dishes, with a photo picker drawn from
  the bundled library, veg and combo toggles, and price validation.
- **Instructor → Workshops**: create / edit workshops and their sessions, each
  with its own seat cap.
- **Super admin → Curation**: add cuisine categories (they appear on the customer
  home filter); **Users** opens a per-user detail sheet.
- **Kitchen → Orders → scan icon**: a full-screen QR scanner that resolves any
  scanned slot code to today's order and advances it, with a manual-entry
  fallback. The per-order "Verify QR & complete" sheet remains for the case where
  staff act on one specific Ready order.
- **Home search** filters kitchens by name, cuisine, or dish.

## Not built

Deliberately left as stubs, each surfaced with a toast rather than a dead
control: kitchen settings persistence, and push notifications
(`expo-notifications` is installed and configured, and Profile → Notifications
shows a demo feed, but no device-registration / send flow is wired).
