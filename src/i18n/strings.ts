/**
 * Trilingual UI strings — ported verbatim from the `STRINGS` table in
 * `ui_kits/customer/customer-data.jsx`. English is the default.
 *
 * Per the brand guide, every screen must tolerate ±40% string length: Tamil and
 * Hindi copy runs longer than English in several of these keys.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const en = {
  home: 'Home',
  workshops: 'Workshops',
  orders: 'Orders',
  profile: 'Profile',
  greet: 'What’s cooking today?',
  search: 'Search kitchens & dishes…',
  featured: 'Featured kitchens',
  cats: 'Cuisines',
  cart: 'Cart',
  checkout: 'Checkout',
  addToCart: 'Add',
  viewCart: 'View cart',
  emptyCart: 'Your cart is hungry — feed it something homemade.',
  placeOrder: 'Place order',
  orderPlaced: 'Order’s simmering! We’ll ping you when it’s ready.',
  yourOrders: 'Your orders',
  showQr: 'Show this QR at pickup',
  book: 'Book workshop',
  language: 'Language',
  bookings: 'My bookings',
  notif: 'Notifications',
  becomePartner: 'Become a partner',
  save20: 'Save up to 20% when you pre-order',
};

/** Every language provides the same keys as English. */
export type Strings = typeof en;

const ta: Strings = {
  home: 'முகப்பு',
  workshops: 'பட்டறைகள்',
  orders: 'ஆர்டர்கள்',
  profile: 'சுயவிவரம்',
  greet: 'இன்று என்ன சமையல்?',
  search: 'சமையலறைகளைத் தேடுங்கள்…',
  featured: 'சிறப்பு சமையலறைகள்',
  cats: 'சமையல் வகைகள்',
  cart: 'கூடை',
  checkout: 'செக்கவுட்',
  addToCart: 'சேர்',
  viewCart: 'கூடையைப் பார்',
  emptyCart: 'உங்கள் கூடை பசியாக உள்ளது!',
  placeOrder: 'ஆர்டர் செய்',
  orderPlaced: 'ஆர்டர் தயாராகிறது!',
  yourOrders: 'உங்கள் ஆர்டர்கள்',
  showQr: 'பிக்கப்பில் QR காட்டு',
  book: 'பதிவு செய்',
  language: 'மொழி',
  bookings: 'எனது பதிவுகள்',
  notif: 'அறிவிப்புகள்',
  becomePartner: 'கூட்டாளராகுங்கள்',
  save20: 'முன்பதிவில் 20% சேமியுங்கள்',
};

const hi: Strings = {
  home: 'होम',
  workshops: 'वर्कशॉप',
  orders: 'ऑर्डर',
  profile: 'प्रोफ़ाइल',
  greet: 'आज क्या पक रहा है?',
  search: 'रसोई और व्यंजन खोजें…',
  featured: 'चुनिंदा रसोइयाँ',
  cats: 'व्यंजन शैलियाँ',
  cart: 'कार्ट',
  checkout: 'चेकआउट',
  addToCart: 'जोड़ें',
  viewCart: 'कार्ट देखें',
  emptyCart: 'आपका कार्ट भूखा है!',
  placeOrder: 'ऑर्डर करें',
  orderPlaced: 'ऑर्डर पक रहा है!',
  yourOrders: 'आपके ऑर्डर',
  showQr: 'पिकअप पर यह QR दिखाएं',
  book: 'बुक करें',
  language: 'भाषा',
  bookings: 'मेरी बुकिंग',
  notif: 'सूचनाएँ',
  becomePartner: 'पार्टनर बनें',
  save20: 'प्री-ऑर्डर पर 20% तक बचाएं',
};

export const STRINGS: Record<LanguageCode, Strings> = { en, ta, hi };

export const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
};
