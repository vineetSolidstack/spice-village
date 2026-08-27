/**
 * Root — decides what the app is, based on who is signed in.
 *
 * Signed out (with Supabase configured) you get the sign-in screen. Signed in,
 * the portal follows the roles on the account: super admin sees the super-admin
 * app, a kitchen owner sees their kitchen. Nobody can reach a portal their
 * account doesn't hold.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, type Theme } from '@react-navigation/native';

import { CustomerNavigator } from './CustomerNavigator';
import { InstructorNavigator, KitchenNavigator, SuperNavigator } from './PortalNavigators';
import { colors, displayFont, bodyFont } from '../theme';
import { useAuth } from '../state/auth';

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.actionPrimary,
    background: colors.surfacePage,
    card: colors.surfaceCard,
    text: colors.textBody,
    border: colors.borderSubtle,
    notification: colors.actionPrimary,
  },
  fonts: {
    regular: { fontFamily: bodyFont(400), fontWeight: '400' },
    medium: { fontFamily: bodyFont(600), fontWeight: '600' },
    bold: { fontFamily: bodyFont(700), fontWeight: '700' },
    heavy: { fontFamily: displayFont(800), fontWeight: '800' },
  },
};

export function RootNavigator() {
  const { loading, user, role } = useAuth();

  return (
    <NavigationContainer theme={navTheme}>
      {loading ? (
        <View style={styles.splash}>
          <ActivityIndicator color={colors.actionPrimary} />
        </View>
      ) : user && role === 'kitchen' ? (
        <KitchenNavigator />
      ) : user && role === 'instructor' ? (
        <InstructorNavigator />
      ) : user && role === 'super' ? (
        <SuperNavigator />
      ) : (
        // Customers AND signed-out guests browse the same app; sign-in is
        // requested only when they go to order (or from Profile). Rendering
        // the same navigator across the guest→customer transition keeps their
        // place (and cart) instead of remounting.
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.surfacePage, alignItems: 'center', justifyContent: 'center' },
});
