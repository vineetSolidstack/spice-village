/**
 * Edge function: create a Razorpay order for one of our orders.
 *
 * The amount is read from OUR order row, never taken from the client — a
 * customer must not be able to say "this ₹500 order costs ₹1". The Razorpay
 * key secret lives only here, as a Supabase secret, and never reaches the app.
 *
 * Deploy:  supabase functions deploy razorpay-create-order --no-verify-jwt
 * Secrets: supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
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
    const { orderId } = await req.json();
    if (!orderId) return json({ error: 'orderId required' }, 400);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Razorpay keys not configured' }, 500);

    // Verify the caller is the customer who owns this order, using their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, ref, total, payment_state, customer_id')
      .eq('id', orderId)
      .single();
    if (error || !order) return json({ error: 'Order not found' }, 404);
    if (order.payment_state === 'paid') return json({ error: 'Order already paid' }, 409);

    // Create the Razorpay order. Amount is in paise.
    const auth = btoa(`${keyId}:${keySecret}`);
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: order.total * 100,
        currency: 'INR',
        receipt: order.ref,
        // notes travels back on the webhook / verify, tying payment → our order.
        notes: { order_id: order.id },
      }),
    });

    const rzpOrder = await rzpResponse.json();
    if (!rzpResponse.ok) return json({ error: rzpOrder?.error?.description ?? 'Razorpay error' }, 502);

    // Record the attempt and stamp the razorpay order id on ours.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin.from('orders').update({ payment_state: 'pending', razorpay_order_id: rzpOrder.id }).eq('id', order.id);
    await admin.from('payments').insert({
      order_id: order.id,
      razorpay_order_id: rzpOrder.id,
      amount: order.total,
      state: 'pending',
    });

    return json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
