# Handoff: Spice Route — Native App (React Native / Expo)

## Overview
Spice Route is a two-sided marketplace: customers pre-order homemade meals from approved local home kitchens (saving up to 20%) and book cooking workshops; kitchen owners manage menus, pickup slots, and orders; instructors run workshops; a super admin approves and curates. Target: **true native Android + iOS apps built with React Native (Expo)**, backed by **Supabase** (Postgres, Auth, Storage), published via **EAS Build** to Play Store and App Store. Repo: https://github.com/vineetSolidstack/spice-village

## About the Design Files
The files in this bundle are **design references created in HTML/JSX** — interactive prototypes showing intended look and behavior, NOT production code to copy directly. The task is to **recreate these designs in a React Native (Expo) codebase** using RN primitives (View/Text/Pressable/FlatList), React Navigation, and the tokens below. The `.jsx` screen files are readable specs: every color, radius, spacing, and font value in them is the intended value.

## Fidelity
**High-fidelity.** Recreate pixel-perfectly: exact hex values, radii, font sizes and weights as specified in the tokens and screen files. Layouts are mobile-first at 390pt width.

## Build priorities (from the founder)
1. **Customer app first**, then kitchen-owner as a role-switch inside the same app (recommended) — instructor & super-admin portals can stay web-only at launch.
2. QR scanning (kitchen owner verifies pickups) via `expo-camera`/`expo-barcode-scanner`.
3. Push notifications ("order ready") via `expo-notifications`.
4. Trilingual from day one: **English (default), Tamil, Hindi** — switcher lives in Profile (`react-i18next`; demo strings for all three languages are in `ui_kits/customer/customer-data.jsx` as `STRINGS`).

## Screens / Views

### Customer app (`ui_kits/customer/`)
- **Home** — greeting ("What's cooking today?"), location line, search input, savings banner (turmeric tint), horizontally scrolling cuisine filter chips, featured kitchen cards (image top 120, name + Featured badge, cuisine · distance · ★ rating).
- **Kitchen storefront** — 170-high hero with bottom cocoa scrim (name + meta in white), Combos/Meals segmented tabs (**Combos first** — a deliberate decision), "Feeding a crowd? Request a bulk quote" entry row under the tabs, dish rows: 60×60 rounded-12 photo, veg/non-veg dot, name (700/15), one-line description (600/12 muted), price in paprika with struck-through old price, Add button → pill quantity stepper. Sticky "View cart · N" pill button when cart non-empty.
- **Cart** — item rows with 48px thumbs and steppers, green "You saved ₹X by pre-ordering" callout, **pickup-slot picker** (see Business rules), total row, "Place order · ₹X" (disabled until a slot is chosen). Empty state: "Your cart is hungry — feed it something homemade." + 🍛.
- **Bulk order (per kitchen)** — reached only from a kitchen page. Explainer banner; the kitchen's dishes each with a numeric **units** input; Sides/extras input; **calendar date picker** (mini month grid, past days disabled, selected day paprika-filled); delivery-window select (Breakfast 8–9 am / Lunch 12–1 pm / Evening 5–6 pm / Dinner 7–8 pm); contact number; "Request quote · N units" (disabled until units > 0 and a date is picked). Confirmation summarizes units/dishes/date/window and states bulk orders are priced by the kitchen and skip pickup slots.
- **Orders list** — rows: QR icon, kitchen name, slotCode · orderRef · items · when, status badge.
- **Order detail** — status badge; dark plate showing SLOT CODE (display font 34, e.g. "500-07") + pickup time; white card with QR code; slot code repeated large under "Show this QR at pickup"; small "Scans to your slot code · ref SR-7194" line.
- **Workshops list & detail** — cards (image 110, title, seats-left warn badge when ≤3, host · duration · price); detail: session chips, participant stepper, pay-at-venue/pay-online radios, "Book workshop · ₹total"; confirmation toast "Apron on — you're in! 👩‍🍳".
- **Profile** — avatar card, rows (My bookings / Notifications / Become a partner), **LanguagePicker** (three option cards showing English / தமிழ் / हिन्दी in their own scripts; selected = 2px paprika border + check disc).

### Kitchen owner (`ui_kits/admin/`)
- **Dashboard** — Open/Closed badge, stat cards (New orders / Preparing / Today's sales), needs-attention order rows.
- **Orders** — pipeline New → Preparing → Ready → (Verify QR) → Completed; each row shows a dark **slot-code chip** (e.g. 500-07) before the order ref; **bulk quote request card** pinned on top (turmeric 2px border): what/when/contact, "Priced manually — bulk orders skip pickup-slot capacity", Send quote / Decline → status Pending quote → Quoted/Declined.
- **Slots** — per-slot rows: dark slot-code chip, time, "used/cap booked · N left" (warn ≤2 left, danger when full), cap stepper (min = used), Add slot button. Info banner: caps close slots automatically at checkout.
- **Menu** — rows with 44px thumb, price + struck old price, availability Switch (dims row), edit/delete icon buttons, Add item.
- **Settings** — Accepting-orders switch, kitchen name, primary cuisine select, pickup window.

### Instructor (`ui_kits/teacher/`)
Dashboard (Verified badge, stats, next-session banner, recent bookings) · Workshops (Live/Draft cards with per-session capacity "5/8 booked"/"Full") · Bookings (attendee rows with Paid online / Pay at venue badges).

### Super admin (`ui_kits/super/`)
Approvals (approve/review/reject pending kitchens & instructors) · Kitchens (Pending/Approved/Suspended tabs, suspend/reinstate) · Users · Curation (categories + featured-on-home switches).

## Business rules (critical — the founder's core requirements)
1. **Slot capacity**: kitchens define pickup slots (time + max capacity). Checkout requires a slot; a slot with `remaining < cart quantity` is disabled and shown "Full". **The server must re-check remaining capacity inside order creation (Postgres function / edge function) and reject if full** — client-side gating is UX only.
2. **Slot-sequence code**: every order gets a human-readable code `slotDigits-seq` (e.g. slot 5:00 pm, 7th order → **"500-07"**). Shown big on the customer's order screen and as a chip on every kitchen-side order row so staff can sort physical covers by eye. **The QR payload IS the slot code** — scanning yields "500-07"; the verify endpoint resolves it (plus order ref) to full details.
3. **Bulk/event orders**: separate per-kitchen flow, NOT through cart/slots. Customer picks dish units + date + window + contact → lands kitchen-side as **Pending quote** → kitchen sends a quote or declines. Pricing is negotiated; no instant order.
4. **Puns are customer-facing only** — kitchen/instructor/super portals use plain functional copy.

## Interactions & Behavior
- Transitions: 120–200ms, ease-out `cubic-bezier(.22,.9,.35,1)`; fades + small translate-ups; no bounces.
- Press states: darken fill + scale(.98). Buttons are pills.
- Toasts: solid fill, bottom-anchored above the tab bar, auto-dismiss ~2.5s; success toasts carry the punny copy (customer app only).
- Bottom tab bar: 4 tabs, active = paprika + 800 weight; cream at 96% + blur.
- Sticky headers: cream at 92% + backdrop blur.
- Disabled buttons: opacity .45.

## State Management
Cart {itemId: qty}; selected slot; placed order {slotCode, slotTime, count}; language code ('en'|'ta'|'hi') persisted; kitchen-side: orders with status pipeline, slots with cap/used, bulk request status. Supabase realtime for order-status changes → push notification.

## Design Tokens
Full set in `tokens/*.css`. Key values:
- **Colors**: page #FFF8F0 · card #FFFFFF · sunken #F7EDE0 · primary (paprika) #C1440E, hover #A63A0C, tint #FDF1EA/#FBE3D6 · accent (turmeric) #E8A33D, hover #D18A22, tints #FDF6EA/#FAEBD2 · text #2B1D12, muted #8A6A50, faint #C4AD9A · success #1F7A4D/#DCF2E6 · danger #C62828/#FBE0E0 · info #1565A7/#DFEEFA · borders #EFDFCC (subtle), #C4AD9A (strong)
- **Type**: display **Baloo 2** (700/800) + **Baloo Thambi 2** (Tamil); body **Nunito** (400/600/700/800) + **Mukta** (Hindi) + **Mukta Malar** (Tamil). All on Google Fonts (`@expo-google-fonts/*`). Scale: hero 28 / title 22 / heading 18 / body 15 / small 13 / tiny 11; line-heights 1.15 display, 1.5 body.
- **Spacing**: 4px base — 4/8/12/16/20/24/32/40; screen gutter 16; card padding 16; section gap 24.
- **Radii**: inputs/buttons 12 · cards 16 · sheets/dialogs 20 (bottom sheet w/ grab handle) · chips/pills 999.
- **Shadows** (warm, cocoa-tinted): card `0 1px 3px rgba(92,58,33,.08), 0 4px 12px rgba(92,58,33,.06)`; raised `0 4px 16px rgba(92,58,33,.14)`; overlay `0 12px 40px rgba(43,29,18,.22)`.

## Iconography
**Lucide** (`lucide-react-native`), stroke 1.75 at 20pt customer-side, 2/16-18 admin-side. No icon fonts, no emoji as icons (emoji only in celebratory customer toasts).

## Assets
No logo exists — set "Spice Route" in Baloo 2 wherever a mark would go; do not invent one. All food imagery in the prototypes is gradient placeholders — replace with real photography (kitchen owners upload via Supabase Storage). The fake QR in prototypes is a placeholder; use a real QR lib (`react-native-qrcode-svg`).

## Files
- `readme.md` — full brand guide (content fundamentals, visual foundations, iconography)
- `tokens/` — colors, typography, spacing/shape token CSS
- `components/` — reusable primitive specs (Button, Input, Select, Checkbox, Radio, Switch, Badge, Tag, Tabs, Card, Dialog, Toast, Tooltip, IconButton, LanguagePicker) with `.d.ts` prop contracts and `.prompt.md` usage notes
- `ui_kits/customer|admin|teacher|super/` — the four portals' screen prototypes (`*-screens.jsx` are the layout/value specs; `customer-data.jsx` holds demo data, trilingual `STRINGS`, and slot definitions)
- `SKILL.md` — agent-skill entry point (works with Claude Code: point it here and say "read SKILL.md")
