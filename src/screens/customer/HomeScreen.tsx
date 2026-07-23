/**
 * Home — one kitchen or many, depending on the platform mode the super admin
 * has set. Both branches are full screens of their own.
 */
import React from 'react';

import { useStore } from '../../data/store';
import { SingleKitchenHome } from './SingleKitchenHome';
import { MarketplaceHome } from './MarketplaceHome';
import type { CustomerStackScreen } from '../../navigation/types';

export function HomeScreen(props: CustomerStackScreen<'Home'>) {
  const { appMode } = useStore();
  // In single-kitchen mode the whole app is one branded storefront.
  return appMode === 'single' ? <SingleKitchenHome {...props} /> : <MarketplaceHome {...props} />;
}
