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
import { asset, gradient, type MediaFill } from '../components/Media';
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
  sort_order: number;
  category: string | null;
  bulk_available: boolean | null;
  bulk_price: number | null;
};

function toDish(d: DishRow): Dish {
  return {
    id: d.id,
    name: d.name,
    price: d.price,
    oldPrice: d.old_price,
    veg: d.veg,
    description: d.description ?? '',
    image: resolveImage(d.image_path, d.id),
    available: d.available,
    category: d.category ?? undefined,
    bulkAvailable: d.bulk_available !== false,
    bulkPrice: d.bulk_price ?? undefined,
  };
}

/** Kitchens the signed-in user may see, with their menus. */
export async function fetchKitchens(): Promise<Kitchen[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('kitchens')
    .select(
      'id, slug, name, cuisine, area, rating, featured, state, hero_image_path, bulk_enabled, bulk_min_units, bulk_note,' +
        ' dishes ( id, name, description, price, old_price, veg, is_combo, available, image_path, sort_order, category, bulk_available, bulk_price )',
    )
    .eq('state', 'approved')
    .order('featured', { ascending: false });

  if (error) throw error;

  type KitchenRow = {
    slug: string; name: string; cuisine: string; area: string;
    rating: number | string; featured: boolean; hero_image_path: string | null;
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
  patch: { name?: string; cuisine?: string; area?: string; pickup_window?: string },
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
    return row ? { name: row.kitchen_name } : null;
  } catch (error) {
    console.warn('[spice-route] claimKitchenInvite failed', error);
    return null;
  }
}
