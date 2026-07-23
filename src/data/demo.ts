/**
 * Demo dataset — ported from `ui_kits/customer/customer-data.jsx` plus the
 * seed arrays in the admin, teacher, and super kits.
 *
 * This is what the app renders when no Supabase credentials are configured.
 * The same shapes come back from the Supabase repository, so screens never know
 * which source they're reading from.
 */
import { asset, gradient } from '../components/Media';
import type { MediaFill } from '../components/Media';
import { FOOD_IMAGES } from './images';
import type {
  Approval,
  BulkRequest,
  Dish,
  Kitchen,
  ManagedKitchen,
  Order,
  PlatformUser,
  Slot,
  Workshop,
  WorkshopBooking,
} from './types';

export const CATEGORIES = ['South Indian', 'North Indian', 'Snacks', 'Sweets', 'Healthy'];

/**
 * The founder's own cloud kitchen. In single-kitchen ("showcase") mode the whole
 * customer app is this one brand plus workshops; flipping to marketplace mode
 * opens up the other kitchens. See `appMode` in the store.
 */
export const SHOWCASE_KITCHEN_SLUG = 'nandhan-delight';
export const SHOWCASE_KITCHEN_NAME = 'Nandhan Delight';

const dish = (
  id: string,
  name: string,
  price: number,
  oldPrice: number,
  veg: boolean,
  description: string,
  image: MediaFill,
): Dish => ({ id, name, price, oldPrice, veg, description, image, available: true });

/** A few items (a drink, a dessert) have no matching photo — a warm gradient stands in. */
const F = FOOD_IMAGES;

export const KITCHENS: Kitchen[] = [
  {
    slug: SHOWCASE_KITCHEN_SLUG,
    name: SHOWCASE_KITCHEN_NAME,
    cuisine: 'South Indian',
    distance: 'Cloud kitchen',
    rating: 4.9,
    featured: true,
    image: asset(F.beef_mandi),
    combos: [
      dish('nd-c1', 'Nandhan special thali', 240, 300, true, 'Sambar, rasam, poriyal, curd rice, papad + sweet', asset(F.kedgeree)),
      dish('nd-c2', 'Weekend feast box', 460, 560, false, 'Chicken biryani, chettinad curry, dessert for two', asset(F.lamb_biryani)),
    ],
    menu: [
      dish('nd-1', 'Ghee podi dosa (2 pc)', 100, 120, true, 'Crisp dosa, house podi, extra ghee', asset(F.bread_omelette)),
      dish('nd-2', 'Idli · vada combo', 80, 95, true, 'Two idlis, one medu vada, sambar & chutney', asset(F.dal_fry)),
      dish('nd-3', 'Chettinad chicken curry', 190, 230, false, 'Slow-roasted spice masala, bone-in', asset(F.chicken_handi)),
      dish('nd-4', 'Paneer butter masala', 180, 220, true, 'Creamy tomato gravy with soft paneer', asset(F.matar_paneer)),
      dish('nd-5', 'Hyderabadi chicken biryani', 220, 270, false, 'Dum-cooked, saffron rice, boiled egg', asset(F.lamb_biryani)),
      dish('nd-6', 'Filter coffee', 40, 50, true, 'Frothy, strong, brewed in brass', gradient('#8A6A50', '#5C3A21')),
    ],
  },
  {
    slug: 'anitas-kitchen',
    name: 'Anita’s Kitchen',
    cuisine: 'South Indian',
    distance: '1.2 km',
    rating: 4.8,
    featured: true,
    image: asset(F.chicken_mandi),
    combos: [
      dish('c1', 'Sunday tiffin combo', 220, 275, true, 'Dosa, idli, vada, pongal + filter coffee', asset(F.kedgeree)),
      dish('c2', 'Feast for two', 420, 520, false, 'Chettinad chicken, dosas, dessert for two', asset(F.beef_mandi)),
    ],
    menu: [
      dish('m1', 'Ghee dosa (2 pc)', 90, 110, true, 'Crisp, golden, brushed with homemade ghee', asset(F.bread_omelette)),
      dish('m2', 'Sambar idli bowl', 70, 85, true, 'Soft idlis soaked in drumstick sambar', asset(F.dal_fry)),
      dish('m3', 'Chicken chettinad', 180, 220, false, 'Slow-cooked with roasted spice masala', asset(F.chicken_handi)),
      dish('m4', 'Filter coffee', 35, 40, true, 'Frothy, strong, brewed in brass', gradient('#8A6A50', '#5C3A21')),
    ],
  },
  {
    slug: 'gurpreets-rasoi',
    name: 'Gurpreet’s Rasoi',
    cuisine: 'North Indian',
    distance: '2.1 km',
    rating: 4.6,
    featured: true,
    image: asset(F.lamb_biryani),
    combos: [
      dish('c3', 'Punjabi lunchbox', 250, 310, true, 'Thali + halwa + lassi, packed to go', asset(F.rogan_josh)),
    ],
    menu: [
      dish('m5', 'Rajma chawal thali', 150, 180, true, 'Comfort bowl with pickle & papad', asset(F.rajma)),
      dish('m6', 'Butter paneer + 4 roti', 190, 230, true, 'Creamy tomato gravy, tandoor rotis', asset(F.matar_paneer)),
      dish('m7', 'Gajar halwa cup', 80, 95, true, 'Warm, slow-stirred, extra nuts', gradient('#D9531A', '#A63A0C')),
    ],
  },
  {
    slug: 'meenas-snacks',
    name: 'Meena’s Snack Corner',
    cuisine: 'Snacks',
    distance: '800 m',
    rating: 4.9,
    featured: false,
    image: asset(F.red_curry_kebab),
    combos: [],
    menu: [
      dish('m8', 'Medu vada (4 pc)', 60, 75, true, 'Crunchy outside, cloud-soft inside', asset(F.baingan_bharta)),
      dish('m9', 'Onion pakora plate', 55, 65, true, 'Rainy-day fritters with mint chutney', asset(F.fried_rice)),
    ],
  },
];

/** Kitchen-defined pickup slots with capacity caps (the showcase kitchen). */
export const SLOTS: Slot[] = [
  { digits: '500', time: '5:00 pm', capacity: 15, used: 6 },
  { digits: '515', time: '5:15 pm', capacity: 15, used: 15 },
  { digits: '530', time: '5:30 pm', capacity: 12, used: 3 },
  { digits: '545', time: '5:45 pm', capacity: 12, used: 11 },
  { digits: '600', time: '6:00 pm', capacity: 15, used: 2 },
];

export const WORKSHOPS: Workshop[] = [
  {
    id: 'w1',
    title: 'Master the dosa flip',
    host: 'Chef Anita R.',
    price: 499,
    duration: '2 hrs',
    seatsLeft: 3,
    status: 'Live',
    image: asset(F.bread_omelette),
    sessions: [
      { id: 'w1s1', when: 'Sat 25 Jul · 10 am', capacity: 8, booked: 5 },
      { id: 'w1s2', when: 'Sun 26 Jul · 10 am', capacity: 8, booked: 8 },
      { id: 'w1s3', when: 'Sat 1 Aug · 4 pm', capacity: 8, booked: 2 },
    ],
  },
  {
    id: 'w2',
    title: 'Biryani, layer by layer',
    host: 'Chef Imran K.',
    price: 799,
    duration: '3 hrs',
    seatsLeft: 8,
    status: 'Live',
    image: asset(F.lamb_biryani),
    sessions: [
      { id: 'w2s1', when: 'Sun 26 Jul · 11 am', capacity: 12, booked: 4 },
      { id: 'w2s2', when: 'Sun 2 Aug · 11 am', capacity: 12, booked: 1 },
    ],
  },
  {
    id: 'w3',
    title: 'Sweets of the south',
    host: 'Meena V.',
    price: 399,
    duration: '90 min',
    seatsLeft: 12,
    status: 'Live',
    image: asset(F.noodle_salad),
    sessions: [{ id: 'w3s1', when: 'Sat 25 Jul · 3 pm', capacity: 14, booked: 2 }],
  },
  {
    id: 'w4',
    title: 'Chutney chemistry',
    host: 'Chef Anita R.',
    price: 349,
    duration: '90 min',
    seatsLeft: 10,
    status: 'Draft',
    image: asset(F.green_curry),
    sessions: [{ id: 'w4s1', when: 'Sun 9 Aug · 11 am', capacity: 10, booked: 0 }],
  },
];

/** Workshops the demo instructor (Chef Anita R.) owns. */
export const INSTRUCTOR_WORKSHOP_IDS = ['w1', 'w4'];

export const ORDERS: Order[] = [
  {
    ref: 'SR-7194',
    slotCode: '500-07',
    slotTime: '5:00 pm',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    kitchenName: SHOWCASE_KITCHEN_NAME,
    customerName: 'Priya S.',
    lines: [
      { dishId: 'nd-1', name: 'Ghee podi dosa', quantity: 2, price: 100 },
      { dishId: 'nd-6', name: 'Filter coffee', quantity: 1, price: 40 },
    ],
    total: 240,
    status: 'New',
    when: 'Today · pickup 5:00 pm',
  },
  {
    ref: 'SR-7191',
    slotCode: '500-03',
    slotTime: '5:00 pm',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    kitchenName: SHOWCASE_KITCHEN_NAME,
    customerName: 'Arun M.',
    lines: [{ dishId: 'nd-c1', name: 'Nandhan special thali', quantity: 1, price: 240 }],
    total: 240,
    status: 'Preparing',
    when: 'Today · pickup 5:00 pm',
  },
  {
    ref: 'SR-7188',
    slotCode: '530-01',
    slotTime: '5:30 pm',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    kitchenName: SHOWCASE_KITCHEN_NAME,
    customerName: 'Kavya R.',
    lines: [{ dishId: 'nd-2', name: 'Idli · vada combo', quantity: 2, price: 80 }],
    total: 160,
    status: 'Ready',
    when: 'Today · pickup 5:30 pm',
  },
  {
    ref: 'SR-7180',
    slotCode: '545-11',
    slotTime: '5:45 pm',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    kitchenName: SHOWCASE_KITCHEN_NAME,
    customerName: 'Dev P.',
    lines: [{ dishId: 'nd-3', name: 'Chettinad chicken curry', quantity: 1, price: 190 }],
    total: 190,
    status: 'Completed',
    when: 'Today · pickup 5:45 pm',
  },
];

/** The signed-in customer's own order history (demo: Priya S.). */
export const CUSTOMER_ORDERS: Order[] = [
  {
    ref: 'SR-7102',
    slotCode: '545-09',
    slotTime: '5:45 pm',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    kitchenName: SHOWCASE_KITCHEN_NAME,
    customerName: 'Priya S.',
    lines: [
      { dishId: 'nd-4', name: 'Paneer butter masala', quantity: 1, price: 180 },
      { dishId: 'nd-5', name: 'Hyderabadi chicken biryani', quantity: 1, price: 220 },
    ],
    total: 400,
    status: 'Completed',
    when: 'Tue 14 Jul',
  },
];

export const BULK_REQUESTS: BulkRequest[] = [
  {
    id: 'BQ-102',
    kitchenSlug: SHOWCASE_KITCHEN_SLUG,
    customerName: 'Arun M.',
    contact: '98400 12345',
    what: '500 meal combos · 3 sides',
    when: 'Deliver Sat 2 Aug · 12:30 pm',
    status: 'Pending quote',
  },
];

export const WORKSHOP_BOOKINGS: WorkshopBooking[] = [
  { id: 'b1', workshopId: 'w1', sessionId: 'w1s1', attendee: 'Priya S.', people: 2, payment: 'online', session: 'Sat 25 Jul · 10 am' },
  { id: 'b2', workshopId: 'w1', sessionId: 'w1s1', attendee: 'Arun M.', people: 1, payment: 'venue', session: 'Sat 25 Jul · 10 am' },
  { id: 'b3', workshopId: 'w1', sessionId: 'w1s2', attendee: 'Kavya R.', people: 2, payment: 'online', session: 'Sun 26 Jul · 10 am' },
];

export const APPROVALS: Approval[] = [
  { id: 'a1', name: 'Lakshmi’s Tiffins', kind: 'Kitchen', area: 'Mylapore', applied: '2 days ago' },
  { id: 'a2', name: 'Chef Imran K.', kind: 'Instructor', area: 'Biryani workshops', applied: '4 days ago' },
];

export const MANAGED_KITCHENS: ManagedKitchen[] = [
  { name: SHOWCASE_KITCHEN_NAME, area: 'Cloud kitchen', state: 'Approved', rating: 4.9, featured: true },
  { name: 'Lakshmi’s Tiffins', area: 'Mylapore', state: 'Pending', featured: false },
  { name: 'Anita’s Kitchen', area: 'T. Nagar', state: 'Approved', rating: 4.8, featured: true },
  { name: 'Gurpreet’s Rasoi', area: 'Anna Nagar', state: 'Approved', rating: 4.6, featured: true },
  { name: 'Meena’s Snack Corner', area: 'Adyar', state: 'Approved', rating: 4.9, featured: false },
  { name: 'Quick Bites Co.', area: 'Velachery', state: 'Suspended', reason: 'Hygiene report pending', featured: false },
];

export const PLATFORM_USERS: PlatformUser[] = [
  { name: 'Priya S.', role: 'Customer', orders: 14 },
  { name: 'Arun M.', role: 'Customer', orders: 6 },
  { name: 'Anita R.', role: 'Kitchen owner + instructor', orders: null },
];

/** The signed-in demo identities each portal renders as. */
export const DEMO_PROFILE = {
  customer: { name: 'Priya S.', email: 'priya@example.com', location: 'T. Nagar, Chennai' },
  kitchen: { name: SHOWCASE_KITCHEN_NAME, slug: SHOWCASE_KITCHEN_SLUG, cuisine: 'South Indian', pickupWindow: '5–7 pm' },
  instructor: { name: 'Chef Anita R.', verified: true },
};

/** Today's sales figure shown on the kitchen dashboard. */
export const TODAYS_SALES = 755;
/** This month's earnings shown on the instructor dashboard. */
export const INSTRUCTOR_MONTH_EARNINGS = 7485;
