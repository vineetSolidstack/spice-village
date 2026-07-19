-- Spice Route — Postgres schema
--
-- Encodes the founder's core business rules from the handoff:
--   1. Pickup slots have capacity caps, re-checked server-side at order creation.
--   2. Every order carries a slot-sequence code (`500-07`) which is also the QR payload.
--   3. Bulk/event orders are a separate flow — no cart, no slots, priced by quote.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

create type user_role as enum ('customer', 'kitchen_owner', 'instructor', 'super_admin');
create type approval_state as enum ('pending', 'approved', 'suspended', 'rejected');
create type order_status as enum ('new', 'preparing', 'ready', 'completed', 'cancelled');
create type bulk_status as enum ('pending_quote', 'quoted', 'declined', 'accepted');
create type payment_mode as enum ('venue', 'online');
create type workshop_status as enum ('draft', 'live', 'archived');
create type language_code as enum ('en', 'ta', 'hi');

-- --------------------------------------------------------------- people ----

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  -- Persisted language choice; the app mirrors this into AsyncStorage.
  language language_code not null default 'en',
  created_at timestamptz not null default now()
);

-- A user may hold several roles (the demo instructor also owns a kitchen).
create table user_roles (
  user_id uuid not null references profiles on delete cascade,
  role user_role not null,
  primary key (user_id, role)
);

-- ------------------------------------------------------------- kitchens ----

create table kitchens (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid not null references profiles on delete cascade,
  name text not null,
  cuisine text not null,
  area text not null,
  -- Denormalised display distance is computed client-side from geo; stored
  -- coordinates are the source of truth.
  latitude double precision,
  longitude double precision,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  state approval_state not null default 'pending',
  -- Super-admin curation: featured kitchens surface on the customer home screen.
  featured boolean not null default false,
  -- Kitchen owner's master switch; when false, checkout is blocked.
  accepting_orders boolean not null default true,
  pickup_window text,
  suspension_reason text,
  hero_image_path text,
  created_at timestamptz not null default now()
);

create index kitchens_state_idx on kitchens (state) where state = 'approved';
create index kitchens_featured_idx on kitchens (featured) where featured;

create table dishes (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references kitchens on delete cascade,
  name text not null,
  description text,
  -- Pre-order price and the struck-through walk-in price. The delta is the
  -- "you saved ₹X by pre-ordering" figure shown in the cart.
  price integer not null check (price >= 0),
  old_price integer not null check (old_price >= price),
  veg boolean not null default true,
  -- Combos render above meals on the storefront.
  is_combo boolean not null default false,
  available boolean not null default true,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index dishes_kitchen_idx on dishes (kitchen_id, is_combo, sort_order);

-- ---------------------------------------------------------------- slots ----

create table pickup_slots (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references kitchens on delete cascade,
  -- Clock time as displayed, e.g. '5:00 pm'.
  time_label text not null,
  -- Digits derived from time_label, e.g. '500'. First half of the slot code.
  digits text not null check (digits ~ '^\d{3,4}$'),
  service_date date not null default current_date,
  capacity integer not null check (capacity >= 0),
  -- Running count of items booked into this slot. Only ever moved by
  -- place_order() / cancel_order(), never written directly by clients.
  used integer not null default 0 check (used >= 0),
  -- Monotonic per-slot counter driving the `-07` half of the slot code.
  last_sequence integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kitchen_id, service_date, digits),
  -- Capacity is a hard ceiling at the storage layer, not just in the RPC.
  constraint slot_within_capacity check (used <= capacity)
);

create index pickup_slots_kitchen_idx on pickup_slots (kitchen_id, service_date);

-- --------------------------------------------------------------- orders ----

create table orders (
  id uuid primary key default gen_random_uuid(),
  -- Human reference shown alongside the slot code, e.g. 'SR-7194'.
  ref text not null unique,
  kitchen_id uuid not null references kitchens on delete restrict,
  customer_id uuid not null references profiles on delete restrict,
  slot_id uuid not null references pickup_slots on delete restrict,
  -- The full slot-sequence code, e.g. '500-07'. THIS IS THE QR PAYLOAD.
  slot_code text not null,
  sequence integer not null,
  item_count integer not null check (item_count > 0),
  total integer not null check (total >= 0),
  status order_status not null default 'new',
  placed_at timestamptz not null default now(),
  completed_at timestamptz,
  -- A slot code is unique per slot; scanning one resolves to exactly one order.
  unique (slot_id, sequence),
  unique (slot_id, slot_code)
);

create index orders_kitchen_status_idx on orders (kitchen_id, status);
create index orders_customer_idx on orders (customer_id, placed_at desc);

create table order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  dish_id uuid not null references dishes on delete restrict,
  -- Name and price are snapshotted so historical orders survive menu edits.
  dish_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create index order_lines_order_idx on order_lines (order_id);

-- ----------------------------------------------------------- bulk quotes ----

-- Bulk orders deliberately bypass cart and slots: the kitchen prices them by
-- hand and they consume no pickup-slot capacity.
create table bulk_requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kitchen_id uuid not null references kitchens on delete cascade,
  customer_id uuid not null references profiles on delete restrict,
  contact_phone text not null,
  -- Requested delivery date and window (e.g. 'Lunch · 12–1 pm').
  delivery_date date not null,
  delivery_window text not null,
  sides_note text,
  status bulk_status not null default 'pending_quote',
  -- Populated when the kitchen sends a quote.
  quoted_total integer check (quoted_total >= 0),
  quoted_at timestamptz,
  created_at timestamptz not null default now()
);

create table bulk_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references bulk_requests on delete cascade,
  dish_id uuid not null references dishes on delete restrict,
  dish_name text not null,
  units integer not null check (units > 0)
);

-- ------------------------------------------------------------ workshops ----

create table workshops (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles on delete cascade,
  title text not null,
  description text,
  price integer not null check (price >= 0),
  duration_label text not null,
  status workshop_status not null default 'draft',
  hero_image_path text,
  created_at timestamptz not null default now()
);

create table workshop_sessions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops on delete cascade,
  starts_at timestamptz not null,
  -- Pre-formatted label, e.g. 'Sat 25 Jul · 10 am'.
  when_label text not null,
  capacity integer not null check (capacity > 0),
  booked integer not null default 0 check (booked >= 0),
  constraint session_within_capacity check (booked <= capacity)
);

create index workshop_sessions_workshop_idx on workshop_sessions (workshop_id, starts_at);

create table workshop_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workshop_sessions on delete cascade,
  customer_id uuid not null references profiles on delete restrict,
  people integer not null check (people > 0),
  payment payment_mode not null,
  total integer not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index workshop_bookings_session_idx on workshop_bookings (session_id);
