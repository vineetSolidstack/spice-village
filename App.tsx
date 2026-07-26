/**
 * Spice Route — app entry.
 *
 * Provider order matters: language sits outermost because the theme's font
 * resolution depends on it, then the store, then the cart (which reads the
 * store's kitchen catalogue).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandSplash, ToastProvider } from './src/components';
import { LanguageProvider } from './src/i18n';
import { StoreProvider } from './src/data/store';
import { CartProvider } from './src/state/cart';
import { FavouritesProvider } from './src/state/favourites';
import { AuthProvider } from './src/state/auth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, useFonts } from './src/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts();
  // The branded door-opening animation plays once per cold start, on top of the
  // app. It's dismissed when the reveal finishes.
  const [splashDone, setSplashDone] = useState(false);

  // Hold the cream background until the trilingual faces are ready, so text
  // never flashes in a fallback system font (and the wordmark renders right).
  if (!fontsLoaded && !fontError) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StoreProvider>
          <CartProvider>
            <FavouritesProvider>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <RootNavigator />
                {!splashDone ? <BrandSplash onDone={() => setSplashDone(true)} /> : null}
              </ToastProvider>
            </AuthProvider>
          </FavouritesProvider>
          </CartProvider>
        </StoreProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.surfacePage },
});
