/**
 * Favourite dishes.
 *
 * A set of dish ids the customer has hearted, persisted to the device so it
 * survives restarts. Kept deliberately local: favourites are a personal
 * convenience, not shared data, so there's no need to round-trip the server.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spiceroute.favourites';

type FavouritesValue = {
  ids: Set<string>;
  isFavourite: (dishId: string) => boolean;
  toggle: (dishId: string) => void;
};

const FavouritesContext = createContext<FavouritesValue | null>(null);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(KEY).then((saved) => {
      if (cancelled || !saved) return;
      try {
        const list = JSON.parse(saved) as string[];
        setIds(new Set(list));
      } catch {
        // Ignore a corrupt entry; start empty.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((dishId: string) => {
    setIds((current) => {
      const next = new Set(current);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      void AsyncStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const value = useMemo<FavouritesValue>(
    () => ({ ids, isFavourite: (id) => ids.has(id), toggle }),
    [ids, toggle],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites(): FavouritesValue {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>');
  return ctx;
}
