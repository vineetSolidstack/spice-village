/**
 * Slot-sequence codes — business rule #2 in the handoff.
 *
 * Every order gets a human-readable code of the form `slotDigits-seq`: the 7th
 * order in the 5:00 pm slot is "500-07". Kitchen staff sort physical covers by
 * reading these off the chip, so the format is load-bearing, not decorative.
 *
 * **The QR payload IS the slot code.** Scanning yields "500-07" and the verify
 * endpoint resolves that (plus the order ref) to full order details.
 */

/** Digits identifying a pickup slot, derived from its clock time (5:00 pm → "500"). */
export type SlotDigits = string;

/** Build the display/QR code for the Nth order in a slot. */
export function slotCode(digits: SlotDigits, sequence: number): string {
  return `${digits}-${String(sequence).padStart(2, '0')}`;
}

/** Split a code back into its parts; returns null if it isn't a valid slot code. */
export function parseSlotCode(code: string): { digits: SlotDigits; sequence: number } | null {
  const match = /^(\d{3,4})-(\d{2,})$/.exec(code.trim());
  if (!match) return null;
  return { digits: match[1], sequence: Number(match[2]) };
}

/**
 * Derive slot digits from a 12-hour clock time such as "5:00 pm" → "500".
 * Kitchens author slots as times; the digits are always generated, never typed.
 */
export function digitsFromTime(time: string): SlotDigits {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time.replace(/\D/g, '');
  return `${Number(match[1])}${match[2]}`;
}

/** Remaining capacity in a slot. */
export function remaining(slot: { capacity: number; used: number }): number {
  return Math.max(0, slot.capacity - slot.used);
}

/**
 * Whether a slot can still take an order of `quantity` items.
 *
 * This is UX gating only — the server re-checks capacity inside order creation
 * and is the sole authority on whether a slot is actually full.
 */
export function canBook(slot: { capacity: number; used: number }, quantity: number): boolean {
  return quantity > 0 && remaining(slot) >= quantity;
}
