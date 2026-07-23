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
import Constants from 'expo-constants';

import { supabase, isSupabaseConfigured } from '../data/supabase';

/** Publishable key id (safe in the app); the secret lives only in the edge fn. */
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ??
  (Constants.expoConfig?.extra as { razorpayKeyId?: string } | undefined)?.razorpayKeyId ??
  '';

/** True when online payment is available. */
export const paymentsEnabled = Boolean(RAZORPAY_KEY_ID) && isSupabaseConfigured;

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
