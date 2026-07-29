/**
 * Daily service window: open → (last call) → closed → opens tomorrow.
 *
 * Before the kitchen's cutoff time, ordering is open. At the cutoff, today's
 * pre-orders close. But if units are still left, each account gets ONE 10-minute
 * "last call" window the first time they open the app after the cutoff — a final
 * chance to grab a bundle before the day shuts. Once that 10 minutes elapses (or
 * if nothing was left to begin with), it's closed until tomorrow.
 *
 * The one-time window is remembered per account per day in AsyncStorage, so it
 * doesn't restart every time the app is opened.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServicePhase = 'open' | 'lastcall' | 'closed';

const LAST_CALL_MS = 10 * 60 * 1000;
// The last-call window can only OPEN within this long after the cutoff, so it
// stays aligned with the server's ordering grace (see supabase/tweaks.sql).
const LAST_CALL_OPEN_WITHIN_MS = 30 * 60 * 1000;
/** Minimum items to check out during the last-call "grab a 2-pack" window. */
export const LAST_CALL_MIN_ITEMS = 2;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Timestamp (ms) of "HH:MM" today, or null if the string is malformed. */
function cutoffTimestamp(cutoff: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

export type ServiceWindow = {
  phase: ServicePhase;
  /** Ms remaining in the last-call window, when phase === 'lastcall'. */
  lastCallLeftMs: number;
};

/**
 * @param cutoff    "HH:MM" cutoff, or empty/undefined for no cutoff (always open)
 * @param unitsLeft units remaining today across all items (0 = sold out)
 * @param accountKey stable id for the signed-in account (or 'guest')
 */
export function useServiceWindow(
  cutoff: string | undefined,
  unitsLeft: number,
  accountKey: string,
): ServiceWindow {
  const [now, setNow] = useState(() => Date.now());
  // undefined = not yet loaded; null = no window persisted yet
  const [windowStart, setWindowStart] = useState<number | null | undefined>(undefined);

  const cutoffTs = useMemo(() => (cutoff ? cutoffTimestamp(cutoff) : null), [cutoff]);
  const pastCutoff = cutoffTs != null && now >= cutoffTs;
  const hasStock = unitsLeft > 0;
  const storageKey = `lastcall:${accountKey}:${todayKey()}`;

  // Tick each second to drive the countdown and auto-close at zero.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Once we're past the cutoff with stock left, open (or resume) the one-time
  // window for this account. Starting it the first time stamps "now".
  useEffect(() => {
    let cancelled = false;
    if (!pastCutoff || !hasStock) {
      setWindowStart(undefined);
      return;
    }
    AsyncStorage.getItem(storageKey).then((saved) => {
      if (cancelled) return;
      if (saved) {
        // An already-started window keeps running (up to its 10 minutes).
        setWindowStart(Number(saved));
      } else if (cutoffTs != null && Date.now() <= cutoffTs + LAST_CALL_OPEN_WITHIN_MS) {
        // Only open a fresh window shortly after the cutoff.
        const start = Date.now();
        void AsyncStorage.setItem(storageKey, String(start));
        setWindowStart(start);
      } else {
        setWindowStart(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pastCutoff, hasStock, storageKey]);

  // Before the cutoff: fully open.
  if (!pastCutoff) return { phase: 'open', lastCallLeftMs: 0 };
  // At/after cutoff with nothing left: just closed, no offer.
  if (!hasStock) return { phase: 'closed', lastCallLeftMs: 0 };
  // Loading the persisted window — hold closed rather than wrongly allow orders.
  if (windowStart === undefined || windowStart === null) return { phase: 'closed', lastCallLeftMs: 0 };

  const left = windowStart + LAST_CALL_MS - now;
  if (left <= 0) return { phase: 'closed', lastCallLeftMs: 0 };
  return { phase: 'lastcall', lastCallLeftMs: left };
}

/** "9:58" style mm:ss for a countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
