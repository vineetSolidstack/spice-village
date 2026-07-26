/**
 * Edge function: Razorpay webhook receiver.
 *
 * A second, independent path to mark an order paid — the reliable one. The
 * app-initiated `razorpay-verify` runs only if the customer's app is still open
 * when the payment finishes; if they background it, lose signal, or the app
 * crashes on the success screen, this webhook still lands server-to-server and
 * settles the order.
 *
 * Security: Razorpay signs the RAW request body with HMAC-SHA256 using the
 * webhook secret (the one you type into the Razorpay dashboard) and sends it in
 * the `x-razorpay-signature` header. We recompute it over the exact bytes and
 * reject anything that doesn't match — so a forged "payment captured" is
 * ignored. This secret is DIFFERENT from your key secret.
 *
 * Deploy:  supabase functions deploy razorpay-webhook --no-verify-jwt
 * Secret:  supabase secrets set RAZORPAY_WEBHOOK_SECRET=<the same value you
 *          paste into Razorpay's webhook "Secret" field>
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'Webhook secret not configured' }, 500);

  // Read the RAW body first — the signature is over these exact bytes, so we
  // must not JSON.parse before verifying.
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  const expected = await hmacSha256Hex(secret, raw);
  if (!signature || !timingSafeEqual(expected, signature)) {
    return json({ error: 'Invalid signature' }, 401);
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const payment = event.payload?.payment?.entity;

  try {
    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        if (!payment) break;
        // Find our order two ways: the notes we stamped at creation, or the
        // razorpay order id we saved on the row. Notes win when present.
        const ourOrderId = payment.notes?.order_id ?? (await lookupByRzpOrder(admin, payment.order_id));
        if (!ourOrderId) return json({ ok: true, note: 'no matching order' });
        await admin.rpc('mark_order_paid', {
          p_order_id: ourOrderId,
          p_razorpay_order_id: payment.order_id,
          p_razorpay_payment_id: payment.id,
        });
        break;
      }
      case 'payment.failed': {
        if (!payment) break;
        const ourOrderId = payment.notes?.order_id ?? (await lookupByRzpOrder(admin, payment.order_id));
        // Best-effort: release the reservation so the units go back to the pool.
        if (ourOrderId) await admin.rpc('release_unpaid_order', { p_order_id: ourOrderId });
        break;
      }
      default:
        // Acknowledge everything else so Razorpay doesn't retry.
        break;
    }
  } catch (e) {
    // A 500 makes Razorpay retry, which is what we want on a transient DB error.
    return json({ error: String(e) }, 500);
  }

  return json({ ok: true });
});

async function lookupByRzpOrder(
  admin: ReturnType<typeof createClient>,
  rzpOrderId: string | undefined,
): Promise<string | null> {
  if (!rzpOrderId) return null;
  const { data } = await admin
    .from('orders')
    .select('id')
    .eq('razorpay_order_id', rzpOrderId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id?: string;
        notes?: { order_id?: string };
      };
    };
  };
};

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
    headers: { 'Content-Type': 'application/json' },
  });
}
