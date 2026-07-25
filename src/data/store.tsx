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
};

const BUSINESS_KEY = 'spiceroute.business';

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
  removeDish: (kitchenSlug: string, dishId: string) => void;
  /** Create a dish (blank id) or replace an existing one, into combos or meals. */
  saveDish: (kitchenSlug: string, dish: Dish, isCombo: boolean) => void;

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
  const [kitchens, setKitchens] = useState<Kitchen[]>(KITCHENS);
  const [slots, setSlots] = useState<Slot[]>(SLOTS);
  const [customerOrders, setCustomerOrders] = useState<Order[]>(CUSTOMER_ORDERS);
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>(ORDERS);
  const [bulkRequests, setBulkRequests] = useState<BulkRequest[]>(BULK_REQUESTS);
  const [workshops, setWorkshops] = useState<Workshop[]>(WORKSHOPS);
  const [bookings, setBookings] = useState<WorkshopBooking[]>(WORKSHOP_BOOKINGS);
  const [approvals, setApprovals] = useState<Approval[]>(APPROVALS);
  const [managedKitchens, setManagedKitchens] = useState<ManagedKitchen[]>(MANAGED_KITCHENS);
  const [users] = useState<PlatformUser[]>(PLATFORM_USERS);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
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
      setKitchens(kitchensR.value);
      const showcase =
        (settingsR.status === 'fulfilled' && settingsR.value?.showcaseSlug) ||
        kitchensR.value[0].slug;
      // Keep the business card in step with the kitchen the app showcases.
      const shown = kitchensR.value.find((k) => k.slug === showcase);
      if (shown) {
        setBusiness((current) => ({
          ...current,
          kitchenName: shown.name,
          cuisine: shown.cuisine,
          area: shown.distance,
        }));
      }
      const slots = await fetchApi.fetchSlots(showcase).catch(() => []);
      if (slots.length) setSlots(slots);
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

      // Client-side gate. The server repeats this check authoritatively.
      if (itemCount <= 0 || slot.used + itemCount > slot.capacity) return null;

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
      setCustomerOrders((current) => [order, ...current]);
      setKitchenOrders((current) => [order, ...current]);

      return placed;
    },
    [kitchens, slots],
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

  const addSlot = useCallback((time: string) => {
    setSlots((current) => {
      const digits = time.replace(/\D/g, '').padEnd(3, '0');
      if (current.some((s) => s.digits === digits)) return current;
      return [...current, { digits, time, capacity: 12, used: 0 }];
    });
  }, []);

  const setDishAvailability = useCallback((kitchenSlug: string, dishId: string, available: boolean) => {
    if (isSupabaseConfigured) void fetchApi.setDishAvailableRemote(dishId, available);
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
  }, []);

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

  const saveDish = useCallback((kitchenSlug: string, dish: Dish, isCombo: boolean) => {
    // A blank id means "create"; allocate one and append. Otherwise replace in place.
    const withId: Dish = dish.id ? dish : { ...dish, id: `d${Date.now()}` };

    // Write through so the change reaches every customer, then re-read to pick
    // up the server-allocated id for newly created dishes.
    if (isSupabaseConfigured) {
      // Uploaded photos ride along as an ordered URL array; the cover is [0].
      const photoUrls = (withId.gallery ?? [withId.image])
        .filter((m) => m.kind === 'photo')
        .map((m) => (m as { uri: string }).uri);
      void fetchApi
        .saveDishRemote(
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
            imageUrl: photoUrls[0],
            images: photoUrls.length ? photoUrls : undefined,
          },
          isCombo,
        )
        .then((id) => {
          if (id && !dish.id) void refresh();
        });
    }
    setKitchens((current) =>
      current.map((k) => {
        if (k.slug !== kitchenSlug) return k;
        // A dish only ever lives in one list; drop it from both, then insert.
        const menu = k.menu.filter((d) => d.id !== withId.id);
        const combos = k.combos.filter((d) => d.id !== withId.id);
        return isCombo
          ? { ...k, combos: [...combos, withId], menu }
          : { ...k, menu: [...menu, withId], combos };
      }),
    );
  }, []);

  const saveWorkshop = useCallback((workshop: Workshop) => {
    const withId: Workshop = workshop.id ? workshop : { ...workshop, id: `w${Date.now()}` };
    setWorkshops((current) => {
      const exists = current.some((w) => w.id === withId.id);
      return exists ? current.map((w) => (w.id === withId.id ? withId : w)) : [...current, withId];
    });
  }, []);

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
    setCategories((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
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
      showcaseSlug: SHOWCASE_KITCHEN_SLUG,
      business,
      updateBusiness,
      loading,
      refresh,
      kitchens,
      slots,
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
      getKitchen,
      placeOrder,
      advanceOrder,
      verifySlotCode,
      setSlotCapacity,
      addSlot,
      setDishAvailability,
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
      business,
      updateBusiness,
      loading,
      refresh,
      kitchens,
      slots,
      customerOrders,
      kitchenOrders,
      bulkRequests,
      workshops,
      bookings,
      approvals,
      managedKitchens,
      users,
      acceptingOrders,
      getKitchen,
      placeOrder,
      advanceOrder,
      verifySlotCode,
      setSlotCapacity,
      addSlot,
      setDishAvailability,
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
