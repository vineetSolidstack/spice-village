# Spice Route Design System

**Spice Route** is a two-sided marketplace PWA connecting customers with local home kitchens and cooking-workshop instructors. Customers pre-order authentic homemade meals (saving up to 20%) and book hands-on cooking workshops. Four portals: **Customers**, **Kitchen Owners** (admin), **Workshop Instructors** (teacher), and **Super Admin**. Tech: Next.js 16, React 19, Tailwind v4, Supabase, shadcn/ui, installable PWA.

## Sources
- GitHub repo: https://github.com/vineetSolidstack/spice-village — **empty at build time** (README only). Explore it if code lands there later; it should become the source of truth.
- `uploads/spice-route-summary.pdf` — application summary: portals, features, full route map.
- No brand assets, Figma, or UI code were provided. **This visual identity is an original creation**, directed by the user: fresh & modern marketplace, warm spice palette, friendly rounded type, playful punny copy, mobile-first.

**No logo exists.** Render the brand name "Spice Route" in `--font-display` wherever a mark would go. Do not invent a logo mark.

## Localization (core requirement)
The app ships in **English (default), Tamil, and Hindi**; users switch language in Profile. Font stacks are trilingual: `--font-display` = Baloo 2 (Latin+Devanagari) + Baloo Thambi 2 (Tamil); `--font-body` = Nunito + Mukta (Devanagari) + Mukta Malar (Tamil). Design every screen to tolerate ±40% string length. See `components/i18n/` LanguagePicker.

## CONTENT FUNDAMENTALS
- **Tone: playful with food puns**, but never at the cost of clarity. Puns go in headlines, empty states, and confirmations; body copy and admin/instructor/super-admin surfaces stay functional.
  - Empty cart: "Your cart is hungry — feed it something homemade."
  - Order confirmed: "Order's simmering! We'll ping you when it's ready."
  - Workshop booked: "Apron on — you're in!"
  - Error: "That didn't quite cook right. Try again?"
- **Sentence case everywhere** — buttons, titles, labels. No ALL CAPS except tiny badge labels.
- Address the user as **you**; the platform speaks as **we**.
- Short, warm, concrete. "Pre-order by 4 pm" beats "Orders must be placed before 16:00."
- Emoji: sparing, food-only (🌶️ 🍛 👩‍🍳), only in celebratory moments (confirmation toasts) — never in navigation, buttons, or admin portals.
- Numerals for numbers ("Save 20%", "3 sessions left"). Prices in ₹.
- Admin/teacher/super portals: plain functional copy ("Order confirmed", "Kitchen approved") — puns are customer-facing only.

## VISUAL FOUNDATIONS
- **Colors**: warm cream page (`--surface-page` #FFF8F0), white cards. Primary = paprika #C1440E (actions, brand); accent = turmeric #E8A33D (highlights, ratings, "featured"); cocoa browns for text. Semantic mint/chili/sky for success/danger/info. Max one paprika-filled element per view region; turmeric is seasoning, not a main course.
- **Type**: Baloo 2 (rounded, chunky) for display/headings; Nunito for body. Headings weight 700–800; body 400/600. Mobile scale: hero 28, title 22, heading 18, body 15, small 13, tiny 11.
- **Spacing**: 4px base scale (`--space-1..10`). Screen gutter 16px; card padding 16px; section gaps 24px.
- **Corners**: soft & app-like — cards 16px, inputs/buttons 12px, chips & pills 999px, sheets/modals 20px. Nothing square.
- **Cards**: white, `--shadow-card` (warm brown-tinted, soft), 1px `--border-subtle` optional; food imagery top with 16px top radius.
- **Shadows**: warm-tinted (never grey-blue). Card → raised → overlay tiers only.
- **Backgrounds**: solid cream; no gradients, patterns, or textures. Imagery is real food photography — warm, appetizing, natural light (placeholders until real photos supplied).
- **Buttons**: pill-shaped primary (paprika fill, white text), tonal secondary (paprika-50 fill, paprika text), ghost. Press = darken + scale(.98). Hover = darker fill.
- **Animation**: quick and soft — 120–200ms, `--ease-out`. Fades and small translate-ups; no bounces or springs.
- **Focus**: 2px `--border-focus` ring, 2px offset.
- **Transparency/blur**: only sticky headers/tab bars (cream at 92% + backdrop-blur). Protection: none — text never sits on photos except kitchen hero with a bottom cocoa gradient scrim.
- **Layout**: mobile-first 390px frames; fixed bottom tab-bar (customer app), fixed top app-bar. Admin portals: top bar + list layouts.
- **Iconography**: see ICONOGRAPHY.

## ICONOGRAPHY
- **Lucide** (CDN), matching shadcn/ui convention: 1.75px stroke on 20px customer surfaces, 2px/16-18px in admin. Rounded caps suit the brand. Load: `<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()`, or copy inline SVGs from lucide.dev.
- No icon font, no PNG icons, no filled set. Unicode chars never used as icons. ₹ used as currency glyph in text only.
- Emoji only per Content Fundamentals (celebratory toasts).
- **Substitution flag**: no icon assets were provided; Lucide is my choice, consistent with the declared shadcn stack. Swap centrally if the product adopts another set.

## Intentional additions
- **LanguagePicker** (`components/i18n/`) — required by the trilingual spec; no source component existed.

## Index
- `styles.css` — global entry; imports `tokens/{fonts,colors,typography,shape}.css`
- `guidelines/` — foundation specimen cards (Design System tab)
- `components/core/` — Button, IconButton, Input, Select, Checkbox, Radio, Switch, Badge, Tag, Tabs, Card, Dialog, Toast, Tooltip
- `components/i18n/` — LanguagePicker
- `ui_kits/customer/` — customer app (home, kitchen, cart, orders+QR, workshops)
- `ui_kits/admin/` — kitchen-owner portal
- `ui_kits/teacher/` — instructor portal
- `ui_kits/super/` — super-admin portal
- `SKILL.md` — agent skill entry point
