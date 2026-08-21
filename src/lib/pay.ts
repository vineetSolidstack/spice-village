/**
 * Razorpay / UPI payments — client side.
 *
 * The app only ever *starts* a payment and *reports back* what Razorpay handed
 * it. It never decides success: the razorpay-verify edge function recomputes
 * Razorpay's signature server-side and is the only thing that marks an order
 * paid. So a tampered app cannot fake a paid order.
 *
 * Online payment turns on when a publishable Razorpay key is configured;
 * otherwise checkout stays pay-at-pickup and this module is dormant.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { supabase, isSupabaseConfigured } from '../data/supabase';

/** Publishable key id (safe in the app); the secret lives only in the edge fn. */
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ??
  (Constants.expoConfig?.extra as { razorpayKeyId?: string } | undefined)?.razorpayKeyId ??
  '';

/** True when online payment is available (native WebView or web checkout.js). */
export const paymentsEnabled = Boolean(RAZORPAY_KEY_ID) && isSupabaseConfigured;

/** Whether we're running as a web page (uses Razorpay's checkout.js directly). */
export const isWebPlatform = Platform.OS === 'web';

export type RazorpayOrder = {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
};

/** Ask the server to open a Razorpay order for one of our orders. */
export async function createRazorpayOrder(orderId: string): Promise<RazorpayOrder | null> {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
      body: { orderId },
    });
    if (error) throw error;
    if (!data?.razorpayOrderId) throw new Error(data?.error ?? 'No Razorpay order returned');
    return data as RazorpayOrder;
  } catch (e) {
    console.warn('[spice-route] createRazorpayOrder failed', e);
    return null;
  }
}

/** Send Razorpay's result to the server to verify and mark the order paid. */
export async function verifyPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<boolean> {
  try {
    if (!supabase) return false;
    const { data, error } = await supabase.functions.invoke('razorpay-verify', { body: input });
    if (error) throw error;
    return Boolean(data?.verified);
  } catch (e) {
    console.warn('[spice-route] verifyPayment failed', e);
    return false;
  }
}

/* ---------------------------------------------------- web checkout ------- */

// Load Razorpay's checkout.js once (web only).
let checkoutJs: Promise<void> | null = null;
function loadCheckoutJs(): Promise<void> {
  if (checkoutJs) return checkoutJs;
  const g = globalThis as unknown as { Razorpay?: unknown; document?: Document };
  checkoutJs = new Promise((resolve, reject) => {
    if (!g.document) return reject(new Error('No document'));
    if (g.Razorpay) return resolve();
    const s = g.document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    g.document.head.appendChild(s);
  });
  return checkoutJs;
}

export type WebCheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

/**
 * Open Razorpay Checkout in the browser (web only). Calls back with the signed
 * result on success — the caller then verifies it server-side, same as native.
 */
export async function openRazorpayWebCheckout(opts: {
  razorpay: RazorpayOrder;
  kitchenName: string;
  reference: string;
  name?: string;
  email?: string;
  contact?: string;
  onSuccess: (r: WebCheckoutResult) => void;
  onDismiss: () => void;
  onError: (message: string) => void;
}): Promise<void> {
  try {
    await loadCheckoutJs();
    const Razorpay = (globalThis as unknown as { Razorpay: new (o: unknown) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void } }).Razorpay;
    const rzp = new Razorpay({
      key: opts.razorpay.keyId,
      order_id: opts.razorpay.razorpayOrderId,
      amount: opts.razorpay.amount,
      currency: opts.razorpay.currency,
      name: opts.kitchenName,
      description: opts.reference,
      prefill: { name: opts.name ?? '', email: opts.email ?? '', contact: opts.contact ?? '' },
      theme: { color: '#C1440E' },
      handler: (r: WebCheckoutResult) => opts.onSuccess(r),
      modal: { ondismiss: () => opts.onDismiss() },
    });
    rzp.on('payment.failed', (resp) => opts.onError(resp?.error?.description ?? 'Payment failed'));
    rzp.open();
  } catch (e) {
    opts.onError(String(e));
  }
}

/** Release a reserved slot when the customer abandons payment. */
export async function releaseUnpaidOrder(orderId: string): Promise<void> {
  try {
    if (!supabase) return;
    await supabase.rpc('release_unpaid_order', { p_order_id: orderId });
  } catch (e) {
    console.warn('[spice-route] releaseUnpaidOrder failed', e);
  }
}

/**
 * The HTML that runs Razorpay Checkout inside a WebView. Keeping checkout in a
 * WebView (rather than a native module) means no extra native linking, so it
 * builds on any Expo version. It posts the result back to React Native.
 */
export function razorpayCheckoutHtml(params: {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  themeColor?: string;
}): string {
  const cfg = {
    key: params.keyId,
    order_id: params.razorpayOrderId,
    amount: params.amount,
    currency: params.currency,
    name: params.name,
    description: params.description,
    prefill: {
      name: params.prefillName ?? '',
      email: params.prefillEmail ?? '',
      contact: params.prefillContact ?? '',
    },
    theme: { color: params.themeColor ?? '#C1440E' },
  };

  // The injected JS posts one of: {status:'success', ...}, {status:'dismiss'},
  // {status:'error', message}. React Native listens via onMessage.
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;background:#FFF8F0">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(msg){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } }
  try {
    var options = ${JSON.stringify(cfg)};
    options.handler = function(r){
      post({ status:'success',
             razorpay_payment_id: r.razorpay_payment_id,
             razorpay_order_id: r.razorpay_order_id,
             razorpay_signature: r.razorpay_signature });
    };
    options.modal = { ondismiss: function(){ post({ status:'dismiss' }); } };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(resp){ post({ status:'error', message: (resp && resp.error && resp.error.description) || 'Payment failed' }); });
    rzp.open();
  } catch (e) { post({ status:'error', message: String(e) }); }
</script>
</body></html>`;
}
