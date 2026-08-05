/**
 * Application store.
 *
 * Holds the marketplace state every portal reads and writes: orders and their
 * pipeline, pickup slots and capacity, menus, bulk quote requests, workshops,
 * and super-admin curation.
 *
 * Backed by the demo dataset. When Supabase credentials are configured, the
 * mutations that carry business rules delegate to the SECURITY DEFINER RPCs in
 * `supabase/functions.sql` — see `remote.ts` — and fall back to the local
 * reducer if the call fails, so the UI stays responsive either way.
 *
 * Note the division of responsibility around slot capacity: this store gates
 * the UI, but `place_order()` re-checks capacity under a row lock and is the
 * only authority on whether an order actually fits.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  APPROVALS,
  BULK_REQUESTS,
  CATEGORIES,
  CUSTOMER_ORDERS,
  DEMO_PROFILE,
  KITCHENS,
  SHOWCASE_KITCHEN_SLUG,
  SHOWCASE_KITCHEN_NAME,
  MANAGED_KITCHENS,
  ORDERS,
  PLATFORM_USERS,
  SLOTS,
  WORKSHOPS,
  WORKSHOP_BOOKINGS,
} from './demo';
import type {
  Approval,
  BulkRequest,
  BulkStatus,
  Dish,
  Kitchen,
  KitchenState,
  Loyalty,
  ManagedKitchen,
  Order,
  PaymentMode,
  PlatformUser,
  Slot,
  Workshop,
  WorkshopBooking,
} from './types';
import { NEXT_STATUS } from './types';
import { slotCode } from '../lib/slotCode';
import * as remote from './remote';
import * as fetchApi from './fetch';
import { isSupabaseConfigured } from './supabase';

export type PlacedOrder = { orderId: string | null; ref: string; slotCode: string; slotTime: string; itemCount: number };

/**
 * How the customer app presents itself.
 *   'single'      — one cloud kitchen (Nandhan Delight) + classes, no browsing.
 *   'marketplace' — the full multi-kitchen marketplace.
 * The founder flips this from the super-admin portal as the business grows.
 */
export type AppMode = 'single' | 'marketplace';
const APP_MODE_KEY = 'spiceroute.appMode';

/**
 * Everything about the business that the founder should be able to change from
 * inside the app rather than by editing code: the brand, where it serves, when
 * it hands orders over, and who teaches the classes.
 */
export type Business = {
  kitchenName: string;
  /** Shown to customers as the location line, e.g. "T. Nagar, Chennai". */
  area: string;
  cuisine: string;
  /** Free text shown on every order, e.g. "5–7 pm". */
  pickupWindow: string;
  /** Host name on classes. */
  instructorName: string;
  /** Contact number surfaced on bulk quotes. */
  phone: string;
  /** FSSAI licence number — legally required to display for food businesses. */
  fssai: string;
  /** FSSAI validity, shown alongside the number. */
  fssaiValidUntil: string;
  /** Full registered address, shown on the About screen. */
  legalAddress: string;
  /** Support email for the About screen. */
  supportEmail: string;
  /** Daily pre-order cutoff, 24h "HH:MM" (e.g. "19:00"). After it, today's
   * ordering closes and the app opens again tomorrow. Empty = no cutoff. */
  orderCutoff: string;
};

const BUSINESS_KEY = 'spiceroute.business';
const CATEGORIES_KEY = 'spiceroute.categories';

type StoreValue = {
  /** Source of the data currently on screen. */
  backend: 'demo' | 'supabase';

  /** Single-kitchen showcase vs. full marketplace. */
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  /** The kitchen the app showcases in single mode. */
  showcaseSlug: string;

  /** Editable business details, surfaced across every portal. */
  business: Business;
  updateBusiness: (patch: Partial<Business>) => void;

  /** True while the first Supabase load is in flight. */
  loading: boolean;
  /** Re-read everything from the server. */
  refresh: () => Promise<void>;

  kitchens: Kitchen[];
  slots: Slot[];
  /** Shared unit pool for today; every slot shows this as remaining. */
  dailyStock: { capacity: number; used: number };
  /** Owner sets today's total units. */
  setDailyCapacity: (units: number) => void;
  /** Orders belonging to the signed-in customer, newest first. */
  customerOrders: Order[];
  /** Orders queued at the kitchen the owner portal is signed into. */
  kitchenOrders: Order[];
  bulkRequests: BulkRequest[];
  workshops: Workshop[];
  bookings: WorkshopBooking[];
  approvals: Approval[];
  managedKitchens: ManagedKitchen[];
  users: PlatformUser[];

  /** Kitchen owner's master switch. */
  acceptingOrders: boolean;
  setAcceptingOrders: (value: boolean) => void;

  /** The signed-in customer's stamp card for the showcase kitchen. */
  loyalty: Loyalty;
  /** Re-read the loyalty card (e.g. after an order or a redemption). */
  refreshLoyalty: () => void;

  getKitchen: (slug: string) => Kitchen | undefined;

  /** Checkout. Rejects (returns null) if the slot filled up first. */
  placeOrder: (input: {
    kitchenSlug: string;
    slotDigits: string;
    lines: { dishId: string; name: string; quantity: number; price: number }[];
  }) => Promise<PlacedOrder | null>;

  advanceOrder: (ref: string) => void;
  /** Resolve a scanned QR payload (which is the slot code) to an order. */
  verifySlotCode: (code: string) => Order | undefined;

  setSlotCapacity: (digits: string, capacity: number) => void;
  addSlot: (time: string) => void;

  setDishAvailability: (kitchenSlug: string, dishId: string, available: boolean) => void;
  /** Take a dish out of the customer app entirely (or put it back). */
  setDishHidden: (kitchenSlug: string, dishId: string, hidden: boolean) => void;
  /** Move a dish up/down within its group (combos or meals) and persist order. */
  moveDish: (kitchenSlug: string, dishId: string, isCombo: boolean, dir: 'up' | 'down') => void;
  removeDish: (kitchenSlug: string, dishId: string) => void;
  /** Create a dish (blank id) or replace an existing one. Returns false if
   *  the server write failed (customers won't see the change). */
  saveDish: (
    kitchenSlug: string,
    dish: Dish,
    isCombo: boolean,
    /** How to apply the units field: change the everyday default, override today
     * only, clear the limit, or leave units untouched. */
    unitsChange?: { units: number | null; repeat: boolean } | null,
  ) => Promise<{ ok: boolean; error?: string }>;

  submitBulkRequest: (input: Omit<BulkRequest, 'id' | 'status'>) => void;
  answerBulkRequest: (id: string, status: BulkStatus) => void;

  bookWorkshop: (sessionId: string, people: number, payment: PaymentMode, attendee: string) => void;
  /** Create a workshop (blank id) or replace an existing one. */
  saveWorkshop: (workshop: Workshop) => void;
  /** Add cuisine categories curated by the super admin. */
  categories: string[];
  addCategory: (name: string) => void;

  /** Owner controls for the bulk-quote feature on their kitchen. */
  setBulkSettings: (
    kitchenSlug: string,
    patch: { bulkEnabled?: boolean; bulkMinUnits?: number; bulkNote?: string },
  ) => void;

  decideApproval: (id: string, approved: boolean) => void;
  setKitchenState: (name: string, state: KitchenState) => void;
  setFeatured: (name: string, featured: boolean) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

/** Next order reference; the demo backend allocates these locally. */
let refCounter = 7200;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Production: when a real backend is connected we start EMPTY and show only
  // what the owner has entered — no invented demo menu, orders, or classes.
  // Without a backend (design preview) the bundled demo data fills the screens.
  const seed = <T,>(demo: T, empty: T): T => (isSupabaseConfigured ? empty : demo);

  const [kitchens, setKitchens] = useState<Kitchen[]>(seed(KITCHENS, []));
  const [slots, setSlots] = useState<Slot[]>(seed(SLOTS, []));
  const [customerOrders, setCustomerOrders] = useState<Order[]>(seed(CUSTOMER_ORDERS, []));
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>(seed(ORDERS, []));
  const [bulkRequests, setBulkRequests] = useState<BulkRequest[]>(seed(BULK_REQUESTS, []));
  const [workshops, setWorkshops] = useState<Workshop[]>(seed(WORKSHOPS, []));
  const [bookings, setBookings] = useState<WorkshopBooking[]>(seed(WORKSHOP_BOOKINGS, []));
  const [approvals, setApprovals] = useState<Approval[]>(seed(APPROVALS, []));
  const [managedKitchens, setManagedKitchens] = useState<ManagedKitchen[]>(seed(MANAGED_KITCHENS, []));
  const [users] = useState<PlatformUser[]>(seed(PLATFORM_USERS, []));
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  // The kitchen the app showcases. Starts as the constant, but is updated to
  // the actually-loaded kitchen on refresh — its real slug may differ (e.g. a
  // kitchen created through the application flow gets a suffixed slug).
  const [showcaseSlug, setShowcaseSlug] = useState<string>(SHOWCASE_KITCHEN_SLUG);
  const [loyalty, setLoyalty] = useState<Loyalty>({ stamps: 0, rewards: 0, goal: 8 });
  // Today's total units (sum across items). Empty until the owner sets item units.
  const [dailyStock, setDailyStock] = useState<{ capacity: number; used: number }>(
    seed({ capacity: 50, used: 0 }, { capacity: 0, used: 0 }),
  );
  const [categories, setCategories] = useState<string[]>(seed(CATEGORIES, []));
  // Default to the single-kitchen showcase; the founder opens the marketplace later.
  const [appMode, setAppModeState] = useState<AppMode>('single');

  // Restore the persisted mode on boot.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(APP_MODE_KEY).then((saved) => {
      if (!cancelled && (saved === 'single' || saved === 'marketplace')) setAppModeState(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the owner's cuisine categories on boot so they survive restarts.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(CATEGORIES_KEY).then((saved) => {
      if (cancelled || !saved) return;
      try {
        const parsed = JSON.parse(saved) as string[];
        if (Array.isArray(parsed) && parsed.length) setCategories(parsed);
      } catch {
        // A corrupt entry shouldn't stop boot; the default list stands.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppMode = useCallback((mode: AppMode) => {
    setAppModeState(mode);
    void AsyncStorage.setItem(APP_MODE_KEY, mode);
    // With a backend, this is a platform-wide switch — one super-admin change
    // reaches every customer, not just this device.
    if (isSupabaseConfigured) void fetchApi.savePlatformMode(mode);
  }, []);

  const [business, setBusiness] = useState<Business>({
    kitchenName: SHOWCASE_KITCHEN_NAME,
    area: DEMO_PROFILE.customer.location,
    cuisine: DEMO_PROFILE.kitchen.cuisine,
    pickupWindow: DEMO_PROFILE.kitchen.pickupWindow,
    instructorName: DEMO_PROFILE.instructor.name,
    phone: '',
    fssai: '22426294000044',
    fssaiValidUntil: '27 Jan 2028',
    legalAddress:
      'No. 606/1, Palaniyappa Nagar, Rakkiyapalayam Road, Ammapalayam, Avinashi block, Tirupur, Tamil Nadu 641652',
    supportEmail: 'vineetkrsnaprashad@gmail.com',
    orderCutoff: '19:00',
  });

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(BUSINESS_KEY).then((saved) => {
      if (cancelled || !saved) return;
      try {
        // Merge rather than replace, so fields added in later versions keep
        // their defaults instead of coming back undefined.
        const parsed = JSON.parse(saved) as Partial<Business>;
        setBusiness((current) => ({ ...current, ...parsed }));
      } catch {
        // A corrupt entry shouldn't stop the app booting; defaults stand.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateBusiness = useCallback((patch: Partial<Business>) => {
    setBusiness((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(next));

      // The brand, cuisine, area, and pickup window are public kitchen details;
      // push them to the server so every customer sees the same thing.
      if (isSupabaseConfigured) {
        void fetchApi.saveKitchenDetails(SHOWCASE_KITCHEN_SLUG, {
          name: next.kitchenName,
          cuisine: next.cuisine,
          area: next.area,
          pickup_window: next.pickupWindow,
          fssai_number: next.fssai,
          legal_address: next.legalAddress,
          support_email: next.supportEmail,
          order_cutoff: next.orderCutoff ? next.orderCutoff : null,
        });
      }

      // The brand and cuisine are denormalised onto the kitchen the customer
      // browses, so a rename has to follow through to the storefront.
      if (patch.kitchenName !== undefined || patch.cuisine !== undefined) {
        setKitchens((list) =>
          list.map((k) =>
            k.slug === SHOWCASE_KITCHEN_SLUG
              ? { ...k, name: next.kitchenName, cuisine: next.cuisine }
              : k,
          ),
        );
        setManagedKitchens((list) =>
          list.map((k) => (k.name === current.kitchenName ? { ...k, name: next.kitchenName } : k)),
        );
      }

      // Classes carry the host's name; rename the ones this instructor owns.
      if (patch.instructorName !== undefined) {
        setWorkshops((list) =>
          list.map((w) =>
            w.host === current.instructorName ? { ...w, host: next.instructorName } : w,
          ),
        );
      }

      return next;
    });
  }, []);

  const [loading, setLoading] = useState(isSupabaseConfigured);

  /**
   * Pull the catalogue and live orders from Supabase. Each query is independent
   * so one failure (say, RLS hiding orders from a signed-out user) doesn't blank
   * the whole app — whatever loads, lands.
   */
  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const results = await Promise.allSettled([
      fetchApi.fetchKitchens(),
      fetchApi.fetchWorkshops(),
      fetchApi.fetchOrders(),
      fetchApi.fetchBulkRequests(),
      fetchApi.fetchPlatformSettings(),
    ]);

    const [kitchensR, workshopsR, ordersR, bulkR, settingsR] = results;

    if (kitchensR.status === 'fulfilled' && kitchensR.value.length) {
      let catalogue = kitchensR.value;
      const showcase =
        (settingsR.status === 'fulfilled' && settingsR.value?.showcaseSlug) ||
        catalogue[0].slug;
      // Point the whole app at the kitchen that actually loaded.
      setShowcaseSlug(showcase);

      // The signed-in customer's stamp card for this kitchen.
      void fetchApi.fetchLoyalty(showcase).then((l) => {
        if (l) setLoyalty(l);
      });

      // Merge today's per-item remaining units into the showcase kitchen's menu,
      // so each combo can show "N left" and sell out on its own.
      const menuStock = await fetchApi
        .fetchMenuStock(showcase)
        .catch((): Awaited<ReturnType<typeof fetchApi.fetchMenuStock>> => ({}));
      if (Object.keys(menuStock).length) {
        const withStock = (d: (typeof catalogue)[number]['menu'][number]) =>
          menuStock[d.id] ? { ...d, remainingToday: menuStock[d.id].remaining } : d;
        catalogue = catalogue.map((k) =>
          k.slug !== showcase
            ? k
            : { ...k, combos: k.combos.map(withStock), menu: k.menu.map(withStock) },
        );
      }
      setKitchens(catalogue);

      // Keep the business card in step with the kitchen the app showcases.
      const shown = catalogue.find((k) => k.slug === showcase);
      if (shown) {
        setBusiness((current) => ({
          ...current,
          kitchenName: shown.name,
          cuisine: shown.cuisine,
          area: shown.distance,
          ...(shown.orderCutoff ? { orderCutoff: shown.orderCutoff } : {}),
        }));
      }
      const slots = await fetchApi.fetchSlots(showcase).catch(() => []);
      if (slots.length) setSlots(slots);
      const stock = await fetchApi.fetchTodayStock(showcase).catch(() => null);
      if (stock) setDailyStock(stock);
    }
    if (workshopsR.status === 'fulfilled' && workshopsR.value.length) {
      setWorkshops(workshopsR.value);
    }
    if (ordersR.status === 'fulfilled') {
      setKitchenOrders(ordersR.value);
      setCustomerOrders(ordersR.value);
    }
    if (bulkR.status === 'fulfilled' && bulkR.value.length) {
      setBulkRequests(bulkR.value);
    }
    if (settingsR.status === 'fulfilled' && settingsR.value) {
      setAppModeState(settingsR.value.appMode);
    }

    for (const r of results) {
      if (r.status === 'rejected') console.warn('[spice-route] load failed', r.reason);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getKitchen = useCallback(
    (slug: string) => kitchens.find((k) => k.slug === slug),
    [kitchens],
  );

  const placeOrder = useCallback<StoreValue['placeOrder']>(
    async ({ kitchenSlug, slotDigits, lines }) => {
      const slot = slots.find((s) => s.digits === slotDigits);
      const kitchen = kitchens.find((k) => k.slug === kitchenSlug);
      if (!slot || !kitchen) return null;

      const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
      const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

      // Client-side gate against the SHARED daily pool. The server repeats this
      // check authoritatively inside place_order().
      if (itemCount <= 0 || dailyStock.used + itemCount > dailyStock.capacity) return null;

      let placed: PlacedOrder;

      if (isSupabaseConfigured) {
        const result = await remote.placeOrder({ kitchenSlug, slotDigits, lines });
        // The server rejected it — most likely the slot filled between render
        // and submit. Surface the failure rather than faking a local order.
        if (!result) return null;
        placed = { ...result, orderId: result.orderId };
      } else {
        const sequence = slot.used + 1;
        refCounter += 1;
        placed = {
          orderId: null,
          ref: `SR-${refCounter}`,
          slotCode: slotCode(slot.digits, sequence),
          slotTime: slot.time,
          itemCount,
        };
      }

      const order: Order = {
        ref: placed.ref,
        slotCode: placed.slotCode,
        slotTime: placed.slotTime,
        kitchenSlug,
        kitchenName: kitchen.name,
        customerName: 'Priya S.',
        lines,
        total,
        status: 'New',
        when: `Today · pickup ${placed.slotTime}`,
      };

      setSlots((current) =>
        current.map((s) => (s.digits === slotDigits ? { ...s, used: s.used + itemCount } : s)),
      );
      setDailyStock((current) => ({ ...current, used: current.used + itemCount }));
      // Draw each ordered item down from its own remaining, so a combo can show
      // sold-out immediately without waiting for the next refresh.
      const orderedQty = new Map(lines.map((l) => [l.dishId, l.quantity]));
      const drawDown = (d: Dish): Dish => {
        const q = orderedQty.get(d.id);
        return q != null && d.remainingToday != null
          ? { ...d, remainingToday: Math.max(0, d.remainingToday - q) }
          : d;
      };
      setKitchens((current) =>
        current.map((k) =>
          k.slug !== kitchenSlug
            ? k
            : { ...k, combos: k.combos.map(drawDown), menu: k.menu.map(drawDown) },
        ),
      );
      setCustomerOrders((current) => [order, ...current]);
      setKitchenOrders((current) => [order, ...current]);

      return placed;
    },
    [kitchens, slots, dailyStock],
  );

  const advanceOrder = useCallback((ref: string) => {
    if (isSupabaseConfigured) void remote.advanceOrder(ref);
    const step = (list: Order[]) =>
      list.map((o) => {
        if (o.ref !== ref) return o;
        const next = NEXT_STATUS[o.status];
        return next ? { ...o, status: next } : o;
      });
    setKitchenOrders(step);
    setCustomerOrders(step);
  }, []);

  const verifySlotCode = useCallback(
    (code: string) => kitchenOrders.find((o) => o.slotCode === code.trim()),
    [kitchenOrders],
  );

  const setSlotCapacity = useCallback((digits: string, capacity: number) => {
    setSlots((current) =>
      current.map((s) =>
        // Capacity can never fall below what is already booked.
        s.digits === digits ? { ...s, capacity: Math.max(s.used, capacity) } : s,
      ),
    );
  }, []);

  const setDailyCapacity = useCallback((units: number) => {
    setDailyStock((current) => ({ ...current, capacity: Math.max(current.used, units) }));
    if (isSupabaseConfigured) void fetchApi.setDailyCapacityRemote(SHOWCASE_KITCHEN_SLUG, units);
  }, []);

  const addSlot = useCallback((time: string) => {
    setSlots((current) => {
      const digits = time.replace(/\D/g, '').padEnd(3, '0');
      if (current.some((s) => s.digits === digits)) return current;
      return [...current, { digits, time, capacity: 12, used: 0 }];
    });
  }, []);

  // After an item is switched on/off or taken out, the day's total changes
  // (it only counts available, visible items). Re-pull just today's total.
  const refreshDailyTotal = useCallback((kitchenSlug: string) => {
    if (!isSupabaseConfigured) return;
    void fetchApi.fetchTodayStock(kitchenSlug).then((s) => {
      if (s) setDailyStock(s);
    });
  }, []);

  const refreshLoyalty = useCallback(() => {
    if (!isSupabaseConfigured) return;
    void fetchApi.fetchLoyalty(showcaseSlug).then((l) => {
      if (l) setLoyalty(l);
    });
  }, [showcaseSlug]);

  const setDishAvailability = useCallback((kitchenSlug: string, dishId: string, available: boolean) => {
    if (isSupabaseConfigured) {
      void fetchApi.setDishAvailableRemote(dishId, available).then(() => refreshDailyTotal(kitchenSlug));
    }
    setKitchens((current) =>
      current.map((k) =>
        k.slug !== kitchenSlug
          ? k
          : {
              ...k,
              menu: k.menu.map((d) => (d.id === dishId ? { ...d, available } : d)),
              combos: k.combos.map((d) => (d.id === dishId ? { ...d, available } : d)),
            },
      ),
    );
  }, [refreshDailyTotal]);

  const setDishHidden = useCallback((kitchenSlug: string, dishId: string, hidden: boolean) => {
    if (isSupabaseConfigured) {
      void fetchApi.setDishHiddenRemote(dishId, hidden).then(() => refreshDailyTotal(kitchenSlug));
    }
    setKitchens((current) =>
      current.map((k) =>
        k.slug !== kitchenSlug
          ? k
          : {
              ...k,
              menu: k.menu.map((d) => (d.id === dishId ? { ...d, hidden } : d)),
              combos: k.combos.map((d) => (d.id === dishId ? { ...d, hidden } : d)),
            },
      ),
    );
  }, [refreshDailyTotal]);

  const moveDish = useCallback(
    (kitchenSlug: string, dishId: string, isCombo: boolean, dir: 'up' | 'down') => {
      setKitchens((current) =>
        current.map((k) => {
          if (k.slug !== kitchenSlug) return k;
          const list = [...(isCombo ? k.combos : k.menu)];
          const idx = list.findIndex((d) => d.id === dishId);
          const swap = dir === 'up' ? idx - 1 : idx + 1;
          if (idx < 0 || swap < 0 || swap >= list.length) return k;
          [list[idx], list[swap]] = [list[swap], list[idx]];
          const combos = isCombo ? list : k.combos;
          const menu = isCombo ? k.menu : list;
          // Persist the whole kitchen's order (combos first, then meals).
          if (isSupabaseConfigured) {
            void fetchApi.saveDishOrderRemote([...combos, ...menu].map((d) => d.id));
          }
          return { ...k, combos, menu };
        }),
      );
    },
    [],
  );

  const removeDish = useCallback((kitchenSlug: string, dishId: string) => {
    if (isSupabaseConfigured) void fetchApi.deleteDishRemote(dishId);
    setKitchens((current) =>
      current.map((k) =>
        k.slug !== kitchenSlug
          ? k
          : {
              ...k,
              menu: k.menu.filter((d) => d.id !== dishId),
              combos: k.combos.filter((d) => d.id !== dishId),
            },
      ),
    );
  }, []);

  const saveDish = useCallback<StoreValue['saveDish']>(
    async (kitchenSlug, dish, isCombo, unitsChange) => {
      // A blank id means "create"; allocate a temp one so the optimistic row has a key.
      const withId: Dish = dish.id ? dish : { ...dish, id: `d${Date.now()}` };

      // Optimistically show the change to the owner straight away.
      setKitchens((current) =>
        current.map((k) => {
          if (k.slug !== kitchenSlug) return k;
          const menu = k.menu.filter((d) => d.id !== withId.id);
          const combos = k.combos.filter((d) => d.id !== withId.id);
          return isCombo
            ? { ...k, combos: [...combos, withId], menu }
            : { ...k, menu: [...menu, withId], combos };
        }),
      );

      // Demo mode: nothing to persist, optimistic update is the whole story.
      if (!isSupabaseConfigured) return { ok: true };

      // Only hosted (http) photos can reach customers — a file:// path is local
      // to this device. Dropping them here means we never save a broken image;
      // the editor separately blocks Save until uploads finish.
      const photoUrls = (withId.gallery ?? [withId.image])
        .filter((m) => m.kind === 'photo')
        .map((m) => (m as { uri: string }).uri)
        .filter((u) => /^https?:\/\//.test(u));

      const { id, error } = await fetchApi.saveDishRemote(
        kitchenSlug,
        {
          id: dish.id,
          name: withId.name,
          description: withId.description,
          price: withId.price,
          oldPrice: withId.oldPrice,
          veg: withId.veg,
          available: withId.available,
          category: withId.category,
          rewardEligible: withId.rewardEligible,
          imageUrl: photoUrls[0],
          images: photoUrls.length ? photoUrls : undefined,
        },
        isCombo,
      );

      // Apply the units change against the real row id (a new dish only has one
      // after the insert above). "everyday" vs "today only" is the repeat flag.
      if (id && unitsChange) {
        await fetchApi.setDishDailyUnitsRemote(id, unitsChange.units, unitsChange.repeat);
      }

      // Reconcile with the database either way: on success the real row (and its
      // server id) replaces the optimistic one; on failure the optimistic change
      // is reverted, so the owner sees the truth rather than a phantom save.
      await refresh();
      return { ok: id !== null, error: error ?? undefined };
    },
    [refresh],
  );

  const saveWorkshop = useCallback((workshop: Workshop) => {
    const withId: Workshop = workshop.id ? workshop : { ...workshop, id: `w${Date.now()}` };
    // Optimistic local update for the instructor.
    setWorkshops((current) => {
      const exists = current.some((w) => w.id === withId.id);
      return exists ? current.map((w) => (w.id === withId.id ? withId : w)) : [...current, withId];
    });
    // Persist so the class — and its cover — reaches customers.
    if (isSupabaseConfigured) {
      const imageUrl = withId.image.kind === 'photo' ? withId.image.uri : undefined;
      void fetchApi
        .saveWorkshopRemote({
          id: workshop.id || null,
          title: withId.title,
          price: withId.price,
          duration: withId.duration,
          status: withId.status,
          imageUrl,
          sessions: withId.sessions.map((sn) => ({
            when_label: sn.when,
            capacity: sn.capacity,
            booked: sn.booked,
          })),
        })
        .then((id) => {
          if (id) void refresh();
        });
    }
  }, [refresh]);

  const setBulkSettings = useCallback<StoreValue['setBulkSettings']>((kitchenSlug, patch) => {
    setKitchens((current) =>
      current.map((k) => (k.slug === kitchenSlug ? { ...k, ...patch } : k)),
    );
    if (isSupabaseConfigured) {
      void fetchApi.saveKitchenBulkSettings(kitchenSlug, patch);
    }
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((current) => {
      if (current.includes(trimmed)) return current;
      const next = [...current, trimmed];
      // Persist so the list survives an app restart.
      void AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const submitBulkRequest = useCallback<StoreValue['submitBulkRequest']>((input) => {
    if (isSupabaseConfigured) void remote.requestBulkQuote(input);
    setBulkRequests((current) => [
      { ...input, id: `BQ-${100 + current.length + 1}`, status: 'Pending quote' },
      ...current,
    ]);
  }, []);

  const answerBulkRequest = useCallback((id: string, status: BulkStatus) => {
    if (isSupabaseConfigured) void remote.answerBulkRequest(id, status);
    setBulkRequests((current) => current.map((b) => (b.id === id ? { ...b, status } : b)));
  }, []);

  const bookWorkshop = useCallback<StoreValue['bookWorkshop']>(
    (sessionId, people, payment, attendee) => {
      if (isSupabaseConfigured) void remote.bookWorkshop(sessionId, people, payment);

      setWorkshops((current) =>
        current.map((w) => ({
          ...w,
          sessions: w.sessions.map((s) =>
            s.id === sessionId ? { ...s, booked: Math.min(s.capacity, s.booked + people) } : s,
          ),
        })),
      );

      const workshop = workshops.find((w) => w.sessions.some((s) => s.id === sessionId));
      const session = workshop?.sessions.find((s) => s.id === sessionId);
      if (!workshop || !session) return;

      setBookings((current) => [
        {
          id: `b${current.length + 1}`,
          workshopId: workshop.id,
          sessionId,
          attendee,
          people,
          payment,
          session: session.when,
        },
        ...current,
      ]);
    },
    [workshops],
  );

  const decideApproval = useCallback((id: string, approved: boolean) => {
    setApprovals((current) => {
      const target = current.find((a) => a.id === id);
      if (target && target.kind === 'Kitchen') {
        setManagedKitchens((kitchensList) =>
          kitchensList.map((k) =>
            k.name === target.name ? { ...k, state: approved ? 'Approved' : 'Suspended' } : k,
          ),
        );
      }
      return current.filter((a) => a.id !== id);
    });
  }, []);

  const setKitchenState = useCallback((name: string, state: KitchenState) => {
    setManagedKitchens((current) => current.map((k) => (k.name === name ? { ...k, state } : k)));
  }, []);

  const setFeatured = useCallback((name: string, featured: boolean) => {
    setManagedKitchens((current) => current.map((k) => (k.name === name ? { ...k, featured } : k)));
    setKitchens((current) => current.map((k) => (k.name === name ? { ...k, featured } : k)));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      backend: isSupabaseConfigured ? 'supabase' : 'demo',
      appMode,
      setAppMode,
      showcaseSlug,
      business,
      updateBusiness,
      loading,
      refresh,
      kitchens,
      slots,
      dailyStock,
      setDailyCapacity,
      customerOrders,
      kitchenOrders,
      bulkRequests,
      workshops,
      bookings,
      approvals,
      managedKitchens,
      users,
      acceptingOrders,
      setAcceptingOrders,
      loyalty,
      refreshLoyalty,
      getKitchen,
      placeOrder,
      advanceOrder,
      verifySlotCode,
      setSlotCapacity,
      addSlot,
      setDishAvailability,
      setDishHidden,
      moveDish,
      removeDish,
      saveDish,
      submitBulkRequest,
      answerBulkRequest,
      bookWorkshop,
      saveWorkshop,
      categories,
      addCategory,
      setBulkSettings,
      decideApproval,
      setKitchenState,
      setFeatured,
    }),
    [
      appMode,
      setAppMode,
      showcaseSlug,
      business,
      updateBusiness,
      loading,
      refresh,
      kitchens,
      slots,
      dailyStock,
      setDailyCapacity,
      customerOrders,
      kitchenOrders,
      bulkRequests,
      workshops,
      bookings,
      approvals,
      managedKitchens,
      users,
      acceptingOrders,
      loyalty,
      refreshLoyalty,
      getKitchen,
      placeOrder,
      advanceOrder,
      verifySlotCode,
      setSlotCapacity,
      addSlot,
      setDishAvailability,
      setDishHidden,
      moveDish,
      removeDish,
      saveDish,
      submitBulkRequest,
      answerBulkRequest,
      bookWorkshop,
      saveWorkshop,
      categories,
      addCategory,
      setBulkSettings,
      decideApproval,
      setKitchenState,
      setFeatured,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
