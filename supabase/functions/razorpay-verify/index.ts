/**
 * Edge function: verify a Razorpay payment and mark the order paid.
 *
 * This is the security boundary. Razorpay signs every successful payment with
 * HMAC-SHA256 over `razorpay_order_id|razorpay_payment_id` using your key
 * secret. We recompute that signature here and only mark the order paid if it
 * matches — so a forged "payment succeeded" from a tampered app is rejected.
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
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return json({ error: 'Missing fields' }, 400);
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return json({ error: 'Razorpay secret not configured' }, 500);

    // Recompute the signature Razorpay sent and compare.
    const expected = await hmacSha256Hex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`);
    if (!timingSafeEqual(expected, razorpaySignature)) {
      return json({ verified: false, error: 'Signature mismatch' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Cross-check the razorpay order really belongs to this order of ours.
    const { data: order } = await admin
      .from('orders')
      .select('id, razorpay_order_id')
      .eq('id', orderId)
      .single();
    if (!order || order.razorpay_order_id !== razorpayOrderId) {
      return json({ verified: false, error: 'Order mismatch' }, 400);
    }

    const { error } = await admin.rpc('mark_order_paid', {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
    });
    if (error) return json({ verified: false, error: error.message }, 500);

    return json({ verified: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
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

/** Constant-time compare so a timing attack can't recover the signature. */
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
