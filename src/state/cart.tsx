/**
 * Cart state — `{ dishId: quantity }`, exactly as the prototype models it.
 *
 * Orders are placed against a single kitchen (a pickup slot belongs to one
 * kitchen), so the cart also tracks which kitchen its contents came from.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useStore } from '../data/store';
import type { Dish } from '../data/types';

export type CartRow = Dish & { quantity: number };

type CartValue = {
  items: Record<string, number>;
  /** Slug of the kitchen the cart belongs to, or null when empty. */
  kitchenSlug: string | null;
  /** Total number of items — this is what slot capacity is measured in. */
  count: number;
  rows: CartRow[];
  total: number;
  /** Sum of (old price − price) across the cart. */
  saved: number;
  add: (kitchenSlug: string, dishId: string, delta: number) => void;
  clear: () => void;
  /** Replace the cart with a past order's still-available dishes. Returns how
   *  many lines could be re-added (some may be gone or sold out). */
  reorder: (kitchenSlug: string, lines: { dishId: string; quantity: number }[]) => number;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { kitchens } = useStore();
  const [items, setItems] = useState<Record<string, number>>({});
  const [kitchenSlug, setKitchenSlug] = useState<string | null>(null);

  const add = useCallback((slug: string, dishId: string, delta: number) => {
    setKitchenSlug((current) => {
      // Switching kitchens replaces the cart — a slot belongs to one kitchen.
      if (current && current !== slug) setItems({});
      return slug;
    });
    setItems((current) => {
      const next = Math.max(0, (current[dishId] ?? 0) + delta);
      const updated = { ...current, [dishId]: next };
      if (next === 0) delete updated[dishId];
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setItems({});
    setKitchenSlug(null);
  }, []);

  const reorder = useCallback<CartValue['reorder']>((slug, lines) => {
    const kitchen = kitchens.find((k) => k.slug === slug);
    const catalogue = kitchen ? [...kitchen.combos, ...kitchen.menu] : [];
    const next: Record<string, number> = {};
    let added = 0;
    for (const line of lines) {
      const dish = catalogue.find((d) => d.id === line.dishId);
      // Skip dishes that were removed or are currently unavailable.
      if (dish && dish.available !== false) {
        next[line.dishId] = line.quantity;
        added += 1;
      }
    }
    setKitchenSlug(slug);
    setItems(next);
    return added;
  }, [kitchens]);

  const value = useMemo<CartValue>(() => {
    const kitchen = kitchens.find((k) => k.slug === kitchenSlug);
    const catalogue = kitchen ? [...kitchen.combos, ...kitchen.menu] : [];

    const rows: CartRow[] = Object.entries(items)
      .filter(([, quantity]) => quantity > 0)
      .flatMap(([dishId, quantity]) => {
        const dish = catalogue.find((d) => d.id === dishId);
        return dish ? [{ ...dish, quantity }] : [];
      });

    return {
      items,
      kitchenSlug,
      count: rows.reduce((sum, r) => sum + r.quantity, 0),
      rows,
      total: rows.reduce((sum, r) => sum + r.price * r.quantity, 0),
      saved: rows.reduce((sum, r) => sum + (r.oldPrice - r.price) * r.quantity, 0),
      add,
      clear,
      reorder,
    };
  }, [items, kitchenSlug, kitchens, add, clear, reorder]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
