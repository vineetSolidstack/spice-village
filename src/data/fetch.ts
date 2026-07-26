/**
 * Supabase read path.
 *
 * Loads the catalogue and live orders from the database and maps them into the
 * app's domain types, so what one person edits is what everyone else sees.
 *
 * Photography still comes from the bundled library: rows carry an `image_path`
 * key rather than a URL, so a dish keeps its picture without a Storage upload.
 * A real upload flow can swap `resolveImage` for a signed Storage URL.
 */
import { requireSupabase } from './supabase';
import { asset, gradient, photo, type MediaFill } from '../components/Media';
import { FOOD_IMAGES, FOOD_IMAGE_KEYS } from './images';
import type {
  BulkRequest,
  Dish,
  Kitchen,
  Order,
  OrderStatus,
  Slot,
  Workshop,
} from './types';

/** Map a stored image key to a bundled photo, falling back to a warm gradient. */
function resolveImage(key: string | null, seed: string): MediaFill {
  // An uploaded photo is stored as its public URL.
  if (key && /^https?:\/\//.test(key)) return photo(key);
  if (key && FOOD_IMAGES[key]) return asset(FOOD_IMAGES[key]);
  if (key === 'gradient') return gradient('#8A6A50', '#5C3A21');
  // Deterministic pick so a dish doesn't change photo between loads.
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return asset(FOOD_IMAGES[FOOD_IMAGE_KEYS[hash % FOOD_IMAGE_KEYS.length]]);
}

const STATUS_FROM_DB: Record<string, OrderStatus> = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Completed',
};

type DishRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number;
  veg: boolean;
  is_combo: boolean;
  available: boolean;
  image_path: string | null;
  images: string[] | null;
  sort_order: number;
  category: string | null;
  bulk_available: boolean | null;
  bulk_price: number | null;
  daily_units: number | null;
};

function toDish(d: DishRow): Dish {
  // Prefer the multi-photo array; fall back to the single cover, then a bundled
  // stand-in so a dish is never blank.
  const urls = (d.images ?? []).filter(Boolean);
  const gallery = urls.length
    ? urls.map((u) => resolveImage(u, d.id))
    : [resolveImage(d.image_path, d.id)];
  return {
    id: d.id,
    name: d.name,
    price: d.price,
    oldPrice: d.old_price,
    veg: d.veg,
    description: d.description ?? '',
    image: gallery[0],
    gallery,
    available: d.available,
    category: d.category ?? undefined,
    bulkAvailable: d.bulk_available !== false,
    bulkPrice: d.bulk_price ?? undefined,
    dailyUnits: d.daily_units,
    // remainingToday is filled in from menu_stock after the catalogue loads.
    remainingToday: d.daily_units == null ? null : d.daily_units,
  };
}

/** Kitchens the signed-in user may see, with their menus. */
export async function fetchKitchens(): Promise<Kitchen[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('kitchens')
    .select(
      'id, slug, name, cuisine, area, rating, featured, state, hero_image_path, order_cutoff, bulk_enabled, bulk_min_units, bulk_note,' +
        ' dishes ( id, name, description, price, old_price, veg, is_combo, available, image_path, images, sort_order, category, bulk_available, bulk_price, daily_units )',
    )
    .eq('state', 'approved')
    .order('featured', { ascending: false });

  if (error) throw error;

  type KitchenRow = {
    slug: string; name: string; cuisine: string; area: string;
    rating: number | string; featured: boolean; hero_image_path: string | null;
    order_cutoff: string | null;
    bulk_enabled: boolean | null; bulk_min_units: number | null; bulk_note: string | null;
    dishes: DishRow[] | null;
  };

  return ((data ?? []) as unknown as KitchenRow[]).map((k): Kitchen => {
    const dishes = ((k.dishes ?? []) as DishRow[])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      slug: k.slug,
      name: k.name,
      cuisine: k.cuisine,
      distance: k.area,
      rating: Number(k.rating ?? 0),
      featured: Boolean(k.featured),
      image: resolveImage(k.hero_image_path, k.slug),
      orderCutoff: k.order_cutoff ? k.order_cutoff.slice(0, 5) : null,
      combos: dishes.filter((d) => d.is_combo).map(toDish),
      menu: dishes.filter((d) => !d.is_combo).map(toDish),
      bulkEnabled: k.bulk_enabled !== false,
      bulkMinUnits: k.bulk_min_units ?? 20,
      bulkNote: k.bulk_note ?? undefined,
    };
  });
}

/** Today's pickup slots for one kitchen. */
export async function fetchSlots(kitchenSlug: string): Promise<Slot[]> {
  const db = requireSupabase();
  const { data: kitchen, error: kErr } = await db
    .from('kitchens')
    .select('id')
    .eq('slug', kitchenSlug)
    .maybeSingle();
  if (kErr) throw kErr;
  if (!kitchen) return [];

  const { data, error } = await db
    .from('pickup_slots')
    .select('digits, time_label, capacity, used')
    .eq('kitchen_id', kitchen.id)
    .eq('service_date', new Date().toISOString().slice(0, 10))
    .order('digits');
  if (error) throw error;

  type SlotRow = { digits: string; time_label: string; capacity: number; used: number };
  return ((data ?? []) as unknown as SlotRow[]).map((s) => ({
    digits: s.digits,
    time: s.time_label,
    capacity: s.capacity,
    used: s.used,
  }));
}

type OrderRow = {
  id: string;
  ref: string;
  slot_code: string;
  item_count: number;
  total: number;
  status: string;
  placed_at: string;
  kitchens: { slug: string; name: string } | null;
  pickup_slots: { time_label: string } | null;
  profiles: { full_name: string } | null;
  order_lines: { dish_id: string; dish_name: string; quantity: number; unit_price: number }[] | null;
};

function toOrder(o: OrderRow): Order {
  const slotTime = o.pickup_slots?.time_label ?? '';
  return {
    ref: o.ref,
    slotCode: o.slot_code,
    slotTime,
    kitchenSlug: o.kitchens?.slug ?? '',
    kitchenName: o.kitchens?.name ?? '',
    customerName: o.profiles?.full_name ?? 'Customer',
    lines: (o.order_lines ?? []).map((l) => ({
      dishId: l.dish_id,
      name: l.dish_name,
      quantity: l.quantity,
      price: l.unit_price,
    })),
    total: o.total,
    status: STATUS_FROM_DB[o.status] ?? 'New',
    when: `${new Date(o.placed_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · pickup ${slotTime}`,
  };
}

const ORDER_SELECT =
  'id, ref, slot_code, item_count, total, status, placed_at,' +
  ' kitchens ( slug, name ), pickup_slots ( time_label ), profiles ( full_name ),' +
  ' order_lines ( dish_id, dish_name, quantity, unit_price )';

/**
 * Orders visible to the caller. RLS already scopes this: customers see their
 * own, owners see their kitchen's, so no client-side filter is needed.
 */
export async function fetchOrders(): Promise<Order[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .order('placed_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((o) => toOrder(o as unknown as OrderRow));
}

/** Live workshops plus the caller's own drafts. */
export async function fetchWorkshops(): Promise<Workshop[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('workshops')
    .select(
      'id, title, price, duration_label, status, hero_image_path,' +
        ' profiles:instructor_id ( full_name ),' +
        ' workshop_sessions ( id, when_label, capacity, booked, starts_at )',
    )
    .order('created_at');
  if (error) throw error;

  type WorkshopRow = {
    id: string; title: string; price: number; duration_label: string;
    status: string; hero_image_path: string | null;
    profiles: { full_name?: string } | null;
    workshop_sessions:
      | { id: string; when_label: string; capacity: number; booked: number; starts_at: string }[]
      | null;
  };

  return ((data ?? []) as unknown as WorkshopRow[]).map((w): Workshop => {
    const sessions = ((w.workshop_sessions ?? []) as {
      id: string;
      when_label: string;
      capacity: number;
      booked: number;
      starts_at: string;
    }[])
      .slice()
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const host = (w.profiles as unknown as { full_name?: string } | null)?.full_name ?? '';

    return {
      id: w.id,
      title: w.title,
      host,
      price: w.price,
      duration: w.duration_label,
      seatsLeft: sessions.reduce((max, s) => Math.max(max, s.capacity - s.booked), 0),
      image: resolveImage(w.hero_image_path, w.id),
      status: w.status === 'live' ? 'Live' : 'Draft',
      sessions: sessions.map((s) => ({
        id: s.id,
        when: s.when_label,
        capacity: s.capacity,
        booked: s.booked,
      })),
    };
  });
}

const BULK_STATUS_FROM_DB: Record<string, BulkRequest['status']> = {
  pending_quote: 'Pending quote',
  quoted: 'Quoted',
  declined: 'Declined',
  accepted: 'Quoted',
};

/** Bulk quote requests visible to the caller. */
export async function fetchBulkRequests(): Promise<BulkRequest[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('bulk_requests')
    .select(
      'id, ref, contact_phone, delivery_date, delivery_window, sides_note, status,' +
        ' kitchens ( slug ), profiles ( full_name ),' +
        ' bulk_request_lines ( dish_id, dish_name, units )',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;

  type BulkRow = {
    id: string; ref: string; contact_phone: string; delivery_date: string;
    delivery_window: string; sides_note: string | null; status: string;
    kitchens: { slug?: string } | null;
    profiles: { full_name?: string } | null;
    bulk_request_lines: { dish_id: string; dish_name: string; units: number }[] | null;
  };

  return ((data ?? []) as unknown as BulkRow[]).map((b): BulkRequest => {
    const lines = (b.bulk_request_lines ?? []) as { dish_id: string; dish_name: string; units: number }[];
    const units = lines.reduce((sum, l) => sum + l.units, 0);
    return {
      id: b.ref,
      kitchenSlug: (b.kitchens as unknown as { slug?: string } | null)?.slug ?? '',
      customerName: (b.profiles as unknown as { full_name?: string } | null)?.full_name ?? 'Customer',
      contact: b.contact_phone,
      what: `${units} units · ${lines.length} dishes`,
      when: `Deliver ${b.delivery_date} · ${b.delivery_window}`,
      status: BULK_STATUS_FROM_DB[b.status] ?? 'Pending quote',
      lines,
      deliveryDate: b.delivery_date,
      deliveryWindow: b.delivery_window,
      sidesNote: b.sides_note ?? undefined,
    };
  });
}

export type PlatformSettings = { appMode: 'single' | 'marketplace'; showcaseSlug: string | null };

/** Platform-wide settings — readable by everyone, written by super admins. */
export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('platform_settings')
    .select('app_mode, kitchens:showcase_kitchen_id ( slug )')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as { app_mode: string; kitchens: { slug?: string } | null };
  return {
    appMode: row.app_mode === 'marketplace' ? 'marketplace' : 'single',
    showcaseSlug: row.kitchens?.slug ?? null,
  };
}

/** Super-admin write of the platform mode. */
export async function savePlatformMode(mode: 'single' | 'marketplace'): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('platform_settings')
      .update({ app_mode: mode, updated_at: new Date().toISOString() })
      .eq('id', true);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] savePlatformMode failed', error);
    return false;
  }
}

/** Super-admin write of a kitchen's public details. */
export async function saveKitchenDetails(
  slug: string,
  patch: {
    name?: string; cuisine?: string; area?: string; pickup_window?: string;
    fssai_number?: string; legal_address?: string; support_email?: string;
    order_cutoff?: string | null;
  },
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('kitchens').update(patch).eq('slug', slug);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] saveKitchenDetails failed', error);
    return false;
  }
}

/** Create or update a dish. Returns the row id so new dishes get a real uuid. */
export async function saveDishRemote(
  kitchenSlug: string,
  dish: {
    id: string; name: string; description: string; price: number; oldPrice: number;
    veg: boolean; available?: boolean; category?: string; imageUrl?: string; images?: string[];
  },
  isCombo: boolean,
): Promise<string | null> {
  try {
    const db = requireSupabase();
    const { data: kitchen, error: kErr } = await db
      .from('kitchens').select('id').eq('slug', kitchenSlug).maybeSingle();
    if (kErr || !kitchen) throw kErr ?? new Error('Kitchen not found');

    const row = {
      kitchen_id: kitchen.id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      old_price: dish.oldPrice,
      veg: dish.veg,
      is_combo: isCombo,
      available: dish.available !== false,
      category: dish.category ?? null,
      ...(dish.imageUrl ? { image_path: dish.imageUrl } : {}),
      ...(dish.images ? { images: dish.images } : {}),
    };

    // A local id (created offline) is not a uuid, so treat it as an insert.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(dish.id);
    if (isUuid) {
      const { error } = await db.from('dishes').update(row).eq('id', dish.id);
      if (error) throw error;
      return dish.id;
    }
    const { data, error } = await db.from('dishes').insert(row).select('id').single();
    if (error) throw error;
    return (data as { id: string }).id;
  } catch (error) {
    console.warn('[spice-route] saveDishRemote failed', error);
    return null;
  }
}

export async function deleteDishRemote(dishId: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('dishes').delete().eq('id', dishId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] deleteDishRemote failed', error);
    return false;
  }
}

export async function setDishAvailableRemote(dishId: string, available: boolean): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('dishes').update({ available }).eq('id', dishId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] setDishAvailableRemote failed', error);
    return false;
  }
}

/** Owner writes for the bulk-quote feature. */
export async function saveKitchenBulkSettings(
  slug: string,
  patch: { bulkEnabled?: boolean; bulkMinUnits?: number; bulkNote?: string },
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('kitchens')
      .update({
        ...(patch.bulkEnabled !== undefined ? { bulk_enabled: patch.bulkEnabled } : {}),
        ...(patch.bulkMinUnits !== undefined ? { bulk_min_units: patch.bulkMinUnits } : {}),
        ...(patch.bulkNote !== undefined ? { bulk_note: patch.bulkNote } : {}),
      })
      .eq('slug', slug);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] saveKitchenBulkSettings failed', error);
    return false;
  }
}

/** Per-dish bulk availability and unit price. */
export async function saveDishBulk(
  dishId: string,
  patch: { bulkAvailable?: boolean; bulkPrice?: number | null },
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('dishes')
      .update({
        ...(patch.bulkAvailable !== undefined ? { bulk_available: patch.bulkAvailable } : {}),
        ...(patch.bulkPrice !== undefined ? { bulk_price: patch.bulkPrice } : {}),
      })
      .eq('id', dishId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] saveDishBulk failed', error);
    return false;
  }
}

/** Create a kitchen and return the invite code its owner will claim. */
export async function createKitchenInvite(
  name: string,
  cuisine: string,
  area: string,
): Promise<{ code: string } | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('create_kitchen_invite', {
      p_name: name,
      p_cuisine: cuisine,
      p_area: area,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? { code: row.invite_code } : null;
  } catch (error) {
    console.warn('[spice-route] createKitchenInvite failed', error);
    return null;
  }
}

/** A new owner claims their kitchen with the code they were given. */
export async function claimKitchenInvite(code: string): Promise<{ name: string } | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('claim_kitchen_invite', { p_code: code });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    // Follow the application status through to 'active' (best-effort).
    void db.rpc('mark_application_active', { p_code: code });
    return row ? { name: row.kitchen_name } : null;
  } catch (error) {
    console.warn('[spice-route] claimKitchenInvite failed', error);
    return null;
  }
}

/* ------------------------------------------------- kitchen applications --- */

export type MyApplication = {
  id: string;
  status: 'pending' | 'approved' | 'active' | 'rejected';
  kitchenName: string;
  inviteCode: string | null;
};

export type PendingApplication = {
  id: string;
  fullName: string;
  kitchenName: string;
  area: string;
  cuisine: string;
  phone: string;
  createdAt: string;
};

/** Applicant submits their details to run a kitchen. Returns the new id. */
export async function submitKitchenApplication(input: {
  fullName: string; kitchenName: string; area: string; cuisine: string; phone: string;
}): Promise<string | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('submit_kitchen_application', {
      p_full_name: input.fullName,
      p_kitchen_name: input.kitchenName,
      p_area: input.area,
      p_cuisine: input.cuisine,
      p_phone: input.phone,
    });
    if (error) throw error;
    return (data as string) ?? null;
  } catch (error) {
    console.warn('[spice-route] submitKitchenApplication failed', error);
    return null;
  }
}

/** The caller's latest application, or null if they've never applied. */
export async function fetchMyApplication(): Promise<MyApplication | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('my_kitchen_application');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row
      ? { id: row.id, status: row.status, kitchenName: row.kitchen_name, inviteCode: row.invite_code }
      : null;
  } catch (error) {
    console.warn('[spice-route] fetchMyApplication failed', error);
    return null;
  }
}

/** Super-admin: pending applications awaiting a decision. */
export async function fetchPendingApplications(): Promise<PendingApplication[]> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('pending_kitchen_applications');
    if (error) throw error;
    return ((data ?? []) as Record<string, string>[]).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      kitchenName: r.kitchen_name,
      area: r.area,
      cuisine: r.cuisine,
      phone: r.phone,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.warn('[spice-route] fetchPendingApplications failed', error);
    return [];
  }
}

/** Super-admin approves; returns the invite code shown to the applicant. */
export async function approveKitchenApplication(id: string): Promise<string | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('approve_kitchen_application', { p_id: id });
    if (error) throw error;
    return (data as string) ?? null;
  } catch (error) {
    console.warn('[spice-route] approveKitchenApplication failed', error);
    return null;
  }
}

/** Super-admin rejects an application. */
export async function rejectKitchenApplication(id: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.rpc('reject_kitchen_application', { p_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] rejectKitchenApplication failed', error);
    return false;
  }
}

/* ------------------------------------------------------------ campaigns -- */

export type CampaignAudience = 'all' | 'my_customers' | 'lapsed';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export type Campaign = {
  id: string;
  title: string;
  body: string;
  audience: CampaignAudience;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
};

type CampaignRow = {
  id: string; title: string; body: string; audience: CampaignAudience;
  status: CampaignStatus; scheduled_at: string | null; sent_at: string | null;
  sent_count: number;
};

/** Campaigns for the caller's kitchen, newest first. */
export async function fetchCampaigns(): Promise<Campaign[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('campaigns')
    .select('id, title, body, audience, status, scheduled_at, sent_at, sent_count')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as CampaignRow[]).map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    audience: c.audience,
    status: c.status,
    scheduledAt: c.scheduled_at,
    sentAt: c.sent_at,
    sentCount: c.sent_count,
  }));
}

/** How many devices an audience would reach right now. */
export async function fetchCampaignReach(
  kitchenSlug: string,
  audience: CampaignAudience,
): Promise<number> {
  try {
    const db = requireSupabase();
    const { data: kitchen } = await db.from('kitchens').select('id').eq('slug', kitchenSlug).maybeSingle();
    const { data, error } = await db.rpc('campaign_reach', {
      p_kitchen: (kitchen as { id?: string } | null)?.id ?? null,
      p_audience: audience,
    });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (error) {
    console.warn('[spice-route] campaign_reach failed', error);
    return 0;
  }
}

/** Create a campaign as a draft, or scheduled when a time is given. */
export async function createCampaign(input: {
  kitchenSlug: string;
  title: string;
  body: string;
  audience: CampaignAudience;
  scheduledAt?: string | null;
}): Promise<string | null> {
  try {
    const db = requireSupabase();
    const { data: kitchen } = await db
      .from('kitchens').select('id').eq('slug', input.kitchenSlug).maybeSingle();
    const { data: session } = await db.auth.getUser();
    const userId = session.user?.id;
    if (!userId) throw new Error('Not signed in');

    const { data, error } = await db
      .from('campaigns')
      .insert({
        kitchen_id: (kitchen as { id?: string } | null)?.id ?? null,
        created_by: userId,
        title: input.title,
        body: input.body,
        audience: input.audience,
        status: input.scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: input.scheduledAt ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  } catch (error) {
    console.warn('[spice-route] createCampaign failed', error);
    return null;
  }
}

/** Send immediately. Returns how many devices it went to, or null on failure. */
export async function sendCampaign(id: string): Promise<number | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('send_campaign', { p_id: id });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (error) {
    console.warn('[spice-route] send_campaign failed', error);
    return null;
  }
}

export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('campaigns').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] deleteCampaign failed', error);
    return false;
  }
}

/** Customer-facing marketing opt-out. Order updates are unaffected. */
export async function setMarketingOptIn(optIn: boolean): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { data: session } = await db.auth.getUser();
    const userId = session.user?.id;
    if (!userId) throw new Error('Not signed in');
    const { error } = await db.from('profiles').update({ marketing_opt_in: optIn }).eq('id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] setMarketingOptIn failed', error);
    return false;
  }
}

export async function fetchMarketingOptIn(): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { data: session } = await db.auth.getUser();
    const userId = session.user?.id;
    if (!userId) return true;
    const { data, error } = await db
      .from('profiles').select('marketing_opt_in').eq('id', userId).maybeSingle();
    if (error) throw error;
    return (data as { marketing_opt_in?: boolean } | null)?.marketing_opt_in !== false;
  } catch {
    return true;
  }
}

/* -------------------------------------------------------------- coupons -- */

export type Coupon = {
  id: string;
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

type CouponRow = {
  id: string; code: string; kind: 'percent' | 'flat'; value: number;
  min_order: number; max_discount: number | null; max_uses: number | null;
  used_count: number; active: boolean; expires_at: string | null;
};

/** The owner's discount codes for their kitchen. */
export async function listCoupons(kitchenSlug: string): Promise<Coupon[]> {
  const db = requireSupabase();
  const { data: kitchen } = await db.from('kitchens').select('id').eq('slug', kitchenSlug).maybeSingle();
  if (!kitchen) return [];
  const { data, error } = await db
    .from('coupons')
    .select('id, code, kind, value, min_order, max_discount, max_uses, used_count, active, expires_at')
    .eq('kitchen_id', (kitchen as { id: string }).id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as CouponRow[]).map((c) => ({
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.value,
    minOrder: c.min_order,
    maxDiscount: c.max_discount,
    maxUses: c.max_uses,
    usedCount: c.used_count,
    active: c.active,
    expiresAt: c.expires_at,
  }));
}

export async function createCoupon(
  kitchenSlug: string,
  input: {
    code: string; kind: 'percent' | 'flat'; value: number;
    minOrder?: number; maxDiscount?: number | null; maxUses?: number | null; expiresAt?: string | null;
  },
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { data: kitchen } = await db.from('kitchens').select('id').eq('slug', kitchenSlug).maybeSingle();
    if (!kitchen) throw new Error('Kitchen not found');
    const { error } = await db.from('coupons').insert({
      kitchen_id: (kitchen as { id: string }).id,
      code: input.code.trim().toUpperCase(),
      kind: input.kind,
      value: input.value,
      min_order: input.minOrder ?? 0,
      max_discount: input.maxDiscount ?? null,
      max_uses: input.maxUses ?? null,
      expires_at: input.expiresAt ?? null,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[spice-route] createCoupon failed', e);
    return false;
  }
}

export async function deleteCoupon(id: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[spice-route] deleteCoupon failed', e);
    return false;
  }
}

/** Preview a code at checkout: discount amount and a message. */
export async function previewCoupon(
  kitchenSlug: string,
  code: string,
  subtotal: number,
): Promise<{ valid: boolean; discount: number; message: string }> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('preview_coupon', {
      p_kitchen_slug: kitchenSlug,
      p_code: code,
      p_subtotal: subtotal,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row
      ? { valid: Boolean(row.valid), discount: row.discount ?? 0, message: row.message ?? '' }
      : { valid: false, discount: 0, message: 'That code isn’t valid' };
  } catch (e) {
    console.warn('[spice-route] previewCoupon failed', e);
    return { valid: false, discount: 0, message: 'Could not check that code' };
  }
}

/** Apply a code to a reserved order; returns the discount, or 0 on failure. */
export async function applyCouponToOrder(orderId: string, code: string): Promise<number> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('apply_coupon_to_order', { p_order_id: orderId, p_code: code });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (e) {
    console.warn('[spice-route] applyCouponToOrder failed', e);
    return 0;
  }
}

/* ---------------------------------------------------------- daily stock -- */

export type DailyStock = { capacity: number; used: number };

/** Today's shared unit pool for a kitchen (same remaining on every slot). */
export async function fetchTodayStock(kitchenSlug: string): Promise<DailyStock | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('today_stock', { p_kitchen_slug: kitchenSlug });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? { capacity: row.capacity ?? 0, used: row.used ?? 0 } : null;
  } catch (e) {
    console.warn('[spice-route] today_stock failed', e);
    return null;
  }
}

/** Owner sets today's total units. */
export async function setDailyCapacityRemote(kitchenSlug: string, capacity: number): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.rpc('set_daily_capacity', {
      p_kitchen_slug: kitchenSlug,
      p_capacity: capacity,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[spice-route] set_daily_capacity failed', e);
    return false;
  }
}

/** Per-item remaining units for today, keyed by dish id. */
export async function fetchMenuStock(
  kitchenSlug: string,
): Promise<Record<string, { units: number | null; used: number; remaining: number | null }>> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('menu_stock', { p_kitchen_slug: kitchenSlug });
    if (error) throw error;
    const out: Record<string, { units: number | null; used: number; remaining: number | null }> = {};
    for (const row of (data ?? []) as { dish_id: string; units: number | null; used: number; remaining: number | null }[]) {
      out[row.dish_id] = { units: row.units, used: row.used ?? 0, remaining: row.remaining };
    }
    return out;
  } catch (e) {
    console.warn('[spice-route] menu_stock failed', e);
    return {};
  }
}

/**
 * Set an item's daily units. repeat=true changes the everyday default; false
 * overrides today only. Pass null units to clear the limit (unlimited).
 */
export async function setDishDailyUnitsRemote(
  dishId: string,
  units: number | null,
  repeat: boolean,
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.rpc('set_dish_daily_units', {
      p_dish_id: dishId,
      p_units: units,
      p_repeat: repeat,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[spice-route] set_dish_daily_units failed', e);
    return false;
  }
}

/* ------------------------------------------------------ save workshop ----- */

/** Persist a workshop (create or update) and its sessions. Returns the id. */
export async function saveWorkshopRemote(input: {
  id: string | null;
  title: string;
  price: number;
  duration: string;
  status: 'Live' | 'Draft';
  imageUrl?: string;
  sessions: { when_label: string; capacity: number; booked: number }[];
}): Promise<string | null> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('save_workshop', {
      p_id: input.id && /^[0-9a-f]{8}-/i.test(input.id) ? input.id : null,
      p_title: input.title,
      p_price: input.price,
      p_duration: input.duration,
      p_status: input.status === 'Live' ? 'live' : 'draft',
      p_image_url: input.imageUrl ?? null,
      p_sessions: input.sessions,
    });
    if (error) throw error;
    return typeof data === 'string' ? data : null;
  } catch (e) {
    console.warn('[spice-route] saveWorkshopRemote failed', e);
    return null;
  }
}
