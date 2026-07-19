/**
 * Demo dataset — ported from `ui_kits/customer/customer-data.jsx` plus the
 * seed arrays in the admin, teacher, and super kits.
 *
 * This is what the app renders when no Supabase credentials are configured.
 * The same shapes come back from the Supabase repository, so screens never know
 * which source they're reading from.
 */
import { gradient } from '../components/Media';
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

const dish = (
  id: string,
  name: string,
  price: number,
  oldPrice: number,
  veg: boolean,
  description: string,
  from: string,
  to: string,
): Dish => ({ id, name, price, oldPrice, veg, description, image: gradient(from, to), available: true });

export const KITCHENS: Kitchen[] = [
  {
    slug: 'anitas-kitchen',
    name: 'Anita’s Kitchen',
    cuisine: 'South Indian',
    distance: '1.2 km',
    rating: 4.8,
    featured: true,
    image: gradient('#E8A33D', '#C1440E'),
    combos: [
      dish('c1', 'Sunday tiffin combo', 220, 275, true, 'Dosa, idli, vada, pongal + filter coffee', '#E8A33D', '#C1440E'),
      dish('c2', 'Feast for two', 420, 520, false, 'Chettinad chicken, dosas, dessert for two', '#D9531A', '#7A2E1D'),
    ],
    menu: [
      dish('m1', 'Ghee dosa (2 pc)', 90, 110, true, 'Crisp, golden, brushed with homemade ghee', '#F4C877', '#D9531A'),
      dish('m2', 'Sambar idli bowl', 70, 85, true, 'Soft idlis soaked in drumstick sambar', '#FBE3D6', '#E8A33D'),
      dish('m3', 'Chicken chettinad', 180, 220, false, 'Slow-cooked with roasted spice masala', '#C1440E', '#5C3A21'),
      dish('m4', 'Filter coffee', 35, 40, true, 'Frothy, strong, brewed in brass', '#8A6A50', '#5C3A21'),
    ],
  },
  {
    slug: 'gurpreets-rasoi',
    name: 'Gurpreet’s Rasoi',
    cuisine: 'North Indian',
    distance: '2.1 km',
    rating: 4.6,
    featured: true,
    image: gradient('#D9531A', '#5C3A21'),
    combos: [
      dish('c3', 'Punjabi lunchbox', 250, 310, true, 'Thali + halwa + lassi, packed to go', '#F4C877', '#B0653A'),
    ],
    menu: [
      dish('m5', 'Rajma chawal thali', 150, 180, true, 'Comfort bowl with pickle & papad', '#B0653A', '#7A2E1D'),
      dish('m6', 'Butter paneer + 4 roti', 190, 230, true, 'Creamy tomato gravy, tandoor rotis', '#E8A33D', '#C62828'),
      dish('m7', 'Gajar halwa cup', 80, 95, true, 'Warm, slow-stirred, extra nuts', '#D9531A', '#A63A0C'),
    ],
  },
  {
    slug: 'meenas-snacks',
    name: 'Meena’s Snack Corner',
    cuisine: 'Snacks',
    distance: '800 m',
    rating: 4.9,
    featured: false,
    image: gradient('#2A9D8F', '#1F7A4D'),
    combos: [],
    menu: [
      dish('m8', 'Medu vada (4 pc)', 60, 75, true, 'Crunchy outside, cloud-soft inside', '#E8A33D', '#8A6A50'),
      dish('m9', 'Onion pakora plate', 55, 65, true, 'Rainy-day fritters with mint chutney', '#2A9D8F', '#1F7A4D'),
    ],
  },
];

/** Kitchen-defined pickup slots with capacity caps (demo: Anita's Kitchen). */
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
    image: gradient('#E8A33D', '#D9531A'),
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
    image: gradient('#C1440E', '#5C3A21'),
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
    image: gradient('#2A9D8F', '#17805E'),
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
    image: gradient('#E8A33D', '#8A6A50'),
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
    kitchenSlug: 'anitas-kitchen',
    kitchenName: 'Anita’s Kitchen',
    customerName: 'Priya S.',
    lines: [
      { dishId: 'm1', name: 'Ghee dosa', quantity: 2, price: 90 },
      { dishId: 'm4', name: 'Filter coffee', quantity: 1, price: 35 },
    ],
    total: 215,
    status: 'New',
    when: 'Today · pickup 5:00 pm',
  },
  {
    ref: 'SR-7191',
    slotCode: '500-03',
    slotTime: '5:00 pm',
    kitchenSlug: 'anitas-kitchen',
    kitchenName: 'Anita’s Kitchen',
    customerName: 'Arun M.',
    lines: [{ dishId: 'c1', name: 'Sunday tiffin combo', quantity: 1, price: 220 }],
    total: 220,
    status: 'Preparing',
    when: 'Today · pickup 5:00 pm',
  },
  {
    ref: 'SR-7188',
    slotCode: '530-01',
    slotTime: '5:30 pm',
    kitchenSlug: 'anitas-kitchen',
    kitchenName: 'Anita’s Kitchen',
    customerName: 'Kavya R.',
    lines: [{ dishId: 'm2', name: 'Sambar idli bowl', quantity: 2, price: 70 }],
    total: 140,
    status: 'Ready',
    when: 'Today · pickup 5:30 pm',
  },
  {
    ref: 'SR-7180',
    slotCode: '545-11',
    slotTime: '5:45 pm',
    kitchenSlug: 'anitas-kitchen',
    kitchenName: 'Anita’s Kitchen',
    customerName: 'Dev P.',
    lines: [{ dishId: 'm3', name: 'Chicken chettinad', quantity: 1, price: 180 }],
    total: 180,
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
    kitchenSlug: 'gurpreets-rasoi',
    kitchenName: 'Gurpreet’s Rasoi',
    customerName: 'Priya S.',
    lines: [
      { dishId: 'm5', name: 'Rajma chawal thali', quantity: 1, price: 150 },
      { dishId: 'm7', name: 'Gajar halwa cup', quantity: 1, price: 80 },
    ],
    total: 230,
    status: 'Completed',
    when: 'Tue 14 Jul',
  },
];

export const BULK_REQUESTS: BulkRequest[] = [
  {
    id: 'BQ-102',
    kitchenSlug: 'anitas-kitchen',
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
  kitchen: { name: 'Anita’s Kitchen', slug: 'anitas-kitchen', cuisine: 'South Indian', pickupWindow: '5–7 pm' },
  instructor: { name: 'Chef Anita R.', verified: true },
};

/** Today's sales figure shown on the kitchen dashboard. */
export const TODAYS_SALES = 755;
/** This month's earnings shown on the instructor dashboard. */
export const INSTRUCTOR_MONTH_EARNINGS = 7485;
