/**
 * Edge function: verify a Razorpay payment and mark the order paid.
 *
 * Authoritative check: we fetch the payment straight from Razorpay's API with
 * the key secret (server-to-server) and confirm it belongs to this order and is
 * captured — capturing it ourselves if it's only authorized. The HMAC signature
 * is checked too, but the API status is the source of truth, so a signature
 * quirk can't block a genuine payment.
 *
 * Deploy:  supabase functions deploy razorpay-verify --no-verify-jwt
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();
    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return json({ verified: false, error: 'Missing fields' }, 400);
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ verified: false, error: 'Razorpay keys not configured' }, 500);

    // Signature check (logged, not fatal — the API status below is the truth).
    let signatureOk = false;
    if (razorpaySignature) {
      const expected = await hmacSha256Hex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`);
      signatureOk = timingSafeEqual(expected, razorpaySignature);
    }
    console.log('verify: signatureOk =', signatureOk);

    // Fetch the payment from Razorpay — the authoritative source.
    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payment = await res.json();
    if (!res.ok) {
      console.log('verify: razorpay lookup failed', payment);
      return json({ verified: false, error: payment?.error?.description ?? 'Razorpay lookup failed' }, 502);
    }

    if (payment.order_id !== razorpayOrderId) {
      return json({ verified: false, error: 'Order mismatch' }, 400);
    }

    // Capture it if it's only authorized (auto-capture may be off on the account).
    let status = payment.status;
    if (status === 'authorized') {
      const cap = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payment.amount, currency: payment.currency }),
      });
      const captured = await cap.json();
      if (cap.ok) status = captured.status;
      else console.log('verify: capture failed', captured);
    }

    if (status !== 'captured') {
      return json({ verified: false, error: `Payment status is ${status}` }, 400);
    }

    // Settle it in our database.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await admin.rpc('mark_order_paid', {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
    });
    if (error) {
      console.log('verify: mark_order_paid failed', error.message);
      return json({ verified: false, error: error.message }, 500);
    }

    return json({ verified: true });
  } catch (e) {
    console.log('verify: exception', String(e));
    return json({ verified: false, error: String(e) }, 500);
  }
});

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
