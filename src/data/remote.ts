/**
 * Supabase-backed mutations.
 *
 * Each function maps to one of the SECURITY DEFINER routines in
 * `supabase/functions.sql`. They are only invoked when credentials are
 * configured; otherwise the store runs its local reducer alone.
 *
 * Errors are logged and surfaced as `null`/`false` rather than thrown, so a
 * network failure degrades to "the action didn't take" instead of crashing a
 * screen mid-checkout.
 */
import { requireSupabase } from './supabase';
import type { BulkRequest, BulkStatus, PaymentMode } from './types';

export type RemoteOrder = { orderId: string; ref: string; slotCode: string; slotTime: string; itemCount: number };

/** Map the app's title-case bulk status onto the `bulk_status` enum. */
const BULK_STATUS_DB: Record<BulkStatus, string> = {
  'Pending quote': 'pending_quote',
  Quoted: 'quoted',
  Declined: 'declined',
};

/**
 * Checkout. The RPC re-checks slot capacity under a row lock and allocates the
 * slot-sequence code; a rejection here means the slot genuinely filled up.
 */
export async function placeOrder(input: {
  kitchenSlug: string;
  slotDigits: string;
  lines: { dishId: string; quantity: number }[];
}): Promise<RemoteOrder | null> {
  try {
    const db = requireSupabase();

    const { data: kitchen, error: kitchenError } = await db
      .from('kitchens')
      .select('id')
      .eq('slug', input.kitchenSlug)
      .single();
    if (kitchenError || !kitchen) throw kitchenError ?? new Error('Kitchen not found');

    const { data: slot, error: slotError } = await db
      .from('pickup_slots')
      .select('id')
      .eq('kitchen_id', kitchen.id)
      .eq('digits', input.slotDigits)
      .eq('service_date', new Date().toISOString().slice(0, 10))
      .single();
    if (slotError || !slot) throw slotError ?? new Error('Slot not found');

    const { data, error } = await db.rpc('place_order', {
      p_kitchen_id: kitchen.id,
      p_slot_id: slot.id,
      p_lines: input.lines.map((l) => ({ dish_id: l.dishId, quantity: l.quantity })),
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      orderId: row.order_id,
      ref: row.ref,
      slotCode: row.slot_code,
      slotTime: row.slot_time,
      itemCount: input.lines.reduce((sum, l) => sum + l.quantity, 0),
    };
  } catch (error) {
    console.warn('[spice-route] place_order failed', error);
    return null;
  }
}

/** Advance an order along New → Preparing → Ready → Completed. */
export async function advanceOrder(ref: string): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { data: order, error: lookupError } = await db
      .from('orders')
      .select('id')
      .eq('ref', ref)
      .single();
    if (lookupError || !order) throw lookupError ?? new Error('Order not found');

    const { error } = await db.rpc('advance_order', { p_order_id: order.id });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] advance_order failed', error);
    return false;
  }
}

/**
 * Resolve a scanned QR payload. The payload is the bare slot code ("500-07");
 * the server scopes the lookup to the scanning owner's kitchen and today's
 * service date.
 */
export async function verifySlotCode(kitchenId: string, code: string) {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('verify_slot_code', {
      p_kitchen_id: kitchenId,
      p_slot_code: code,
    });
    if (error) throw error;
    return Array.isArray(data) ? (data[0] ?? null) : data;
  } catch (error) {
    console.warn('[spice-route] verify_slot_code failed', error);
    return null;
  }
}

/** Book workshop seats; capacity is re-checked server-side. */
export async function bookWorkshop(
  sessionId: string,
  people: number,
  payment: PaymentMode,
): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db.rpc('book_workshop', {
      p_session_id: sessionId,
      p_people: people,
      p_payment: payment,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] book_workshop failed', error);
    return false;
  }
}

/** Submit a bulk/event quote request — no cart, no slot, no capacity consumed. */
export async function requestBulkQuote(input: Omit<BulkRequest, 'id' | 'status'>): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { data: kitchen, error: kitchenError } = await db
      .from('kitchens')
      .select('id')
      .eq('slug', input.kitchenSlug)
      .single();
    if (kitchenError || !kitchen) throw kitchenError ?? new Error('Kitchen not found');

    const { error } = await db.rpc('request_bulk_quote', {
      p_kitchen_id: kitchen.id,
      // `what`/`when` are display summaries; the structured lines and date are
      // carried by the caller in the fields below.
      p_lines: input.lines ?? [],
      p_delivery_date: input.deliveryDate,
      p_delivery_window: input.deliveryWindow,
      p_contact_phone: input.contact,
      p_sides_note: input.sidesNote ?? null,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] request_bulk_quote failed', error);
    return false;
  }
}

/** Kitchen answers a bulk request (send quote / decline). */
export async function answerBulkRequest(id: string, status: BulkStatus): Promise<boolean> {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('bulk_requests')
      .update({
        status: BULK_STATUS_DB[status],
        quoted_at: status === 'Quoted' ? new Date().toISOString() : null,
      })
      .eq('ref', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[spice-route] answerBulkRequest failed', error);
    return false;
  }
}
