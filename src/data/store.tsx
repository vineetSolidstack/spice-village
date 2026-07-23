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
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  APPROVALS,
  BULK_REQUESTS,
  CATEGORIES,
  CUSTOMER_ORDERS,
  KITCHENS,
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
import { isSupabaseConfigured } from './supabase';

export type PlacedOrder = { ref: string; slotCode: string; slotTime: string; itemCount: number };

type StoreValue = {
  /** Source of the data currently on screen. */
  backend: 'demo' | 'supabase';

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
        placed = result;
      } else {
        const sequence = slot.used + 1;
        refCounter += 1;
        placed = {
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
      decideApproval,
      setKitchenState,
      setFeatured,
    }),
    [
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
