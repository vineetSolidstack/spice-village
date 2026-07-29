/**
 * Domain types shared by the demo repository and the Supabase repository.
 * These mirror the tables in `supabase/schema.sql`.
 */
import type { MediaFill } from '../components/Media';

export type Dish = {
  id: string;
  name: string;
  /** Current pre-order price in ₹. */
  price: number;
  /** Struck-through walk-in price; the delta is the customer's saving. */
  oldPrice: number;
  veg: boolean;
  description: string;
  image: MediaFill;
  /** All photos for this dish (first is the cover); the app auto-swipes them. */
  gallery?: MediaFill[];
  /** Kitchen-side availability toggle; unavailable dishes dim in the menu. */
  available?: boolean;
  /** "Taken out" — hidden from the customer app entirely (owner still sees it). */
  hidden?: boolean;
  /** Menu section this dish appears under; falls back to Combos / Meals. */
  category?: string;
  /** Whether this dish can be ordered in bulk. */
  bulkAvailable?: boolean;
  /** Per-unit bulk price; undefined means "quoted by hand". */
  bulkPrice?: number;
  /** Units made per day (the repeating default). null/undefined = no limit. */
  dailyUnits?: number | null;
  /** Units still available for today; null when the item isn't limited. */
  remainingToday?: number | null;
};

export type Kitchen = {
  slug: string;
  name: string;
  cuisine: string;
  /** Pre-formatted distance, e.g. "1.2 km" / "800 m". */
  distance: string;
  rating: number;
  featured: boolean;
  image: MediaFill;
  /** Combos are listed before meals — a deliberate product decision. */
  combos: Dish[];
  menu: Dish[];
  /** Daily pre-order cutoff "HH:MM" (24h); after it, today closes. */
  orderCutoff?: string | null;
  /** When false the bulk-quote feature is hidden from customers entirely. */
  bulkEnabled?: boolean;
  bulkMinUnits?: number;
  bulkNote?: string;
};

export type Slot = {
  /** Digits derived from the pickup time, e.g. "500". */
  digits: string;
  /** Human clock time, e.g. "5:00 pm". */
  time: string;
  capacity: number;
  used: number;
};

export const ORDER_STATUSES = ['New', 'Preparing', 'Ready', 'Completed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The kitchen-side pipeline: New → Preparing → Ready → (verify QR) → Completed. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  New: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Completed',
  Completed: null,
};

export type OrderLine = { dishId: string; name: string; quantity: number; price: number };

export type Order = {
  /** Human reference, e.g. "SR-7194". */
  ref: string;
  /** Slot-sequence code and QR payload, e.g. "500-07". */
  slotCode: string;
  /** True order position for the slot (1, 2, 3 …); the printed code is shifted. */
  sequence?: number;
  slotTime: string;
  kitchenSlug: string;
  kitchenName: string;
  customerName: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  /** Pre-formatted "when" line for list rows. */
  when: string;
};

export const BULK_STATUSES = ['Pending quote', 'Quoted', 'Declined'] as const;
export type BulkStatus = (typeof BULK_STATUSES)[number];

export type BulkLine = { dish_id: string; dish_name: string; units: number };

export type BulkRequest = {
  id: string;
  kitchenSlug: string;
  customerName: string;
  contact: string;
  /** Summary of dishes and units for display, e.g. "500 meal combos · 3 sides". */
  what: string;
  /** Delivery date + window for display, e.g. "Deliver Sat 2 Aug · 12:30 pm". */
  when: string;
  status: BulkStatus;
  /** Structured request detail, submitted to `request_bulk_quote`. */
  lines?: BulkLine[];
  /** ISO date (YYYY-MM-DD). */
  deliveryDate?: string;
  deliveryWindow?: string;
  sidesNote?: string;
};

export type WorkshopSession = {
  id: string;
  /** Display label, e.g. "Sat 25 Jul · 10 am". */
  when: string;
  capacity: number;
  booked: number;
};

export type Workshop = {
  id: string;
  title: string;
  host: string;
  price: number;
  /** Duration label, e.g. "2 hrs". */
  duration: string;
  /** Seats left across the next session; drives the warn badge at ≤3. */
  seatsLeft: number;
  image: MediaFill;
  status: 'Live' | 'Draft';
  sessions: WorkshopSession[];
};

export type PaymentMode = 'venue' | 'online';

export type WorkshopBooking = {
  id: string;
  workshopId: string;
  sessionId: string;
  attendee: string;
  people: number;
  payment: PaymentMode;
  /** Session label, denormalised for list rows. */
  session: string;
};

/* -------------------------------------------------- super-admin entities -- */

export type ApprovalKind = 'Kitchen' | 'Instructor';

export type Approval = {
  id: string;
  name: string;
  kind: ApprovalKind;
  /** Area for kitchens, speciality for instructors. */
  area: string;
  applied: string;
};

export type KitchenState = 'Pending' | 'Approved' | 'Suspended';

export type ManagedKitchen = {
  name: string;
  area: string;
  state: KitchenState;
  rating?: number;
  /** Populated when suspended. */
  reason?: string;
  featured: boolean;
};

export type PlatformUser = {
  name: string;
  role: string;
  orders: number | null;
};
