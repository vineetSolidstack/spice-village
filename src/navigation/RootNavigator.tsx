/**
 * Root — picks the portal for the active role and applies the brand's
 * navigation theme.
 */
import React from 'react';
import { NavigationContainer, type Theme } from '@react-navigation/native';

import { CustomerNavigator } from './CustomerNavigator';
import { InstructorNavigator, KitchenNavigator, SuperNavigator } from './PortalNavigators';
import { colors, displayFont, bodyFont } from '../theme';
import { useRole } from '../state/role';

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
  const { role } = useRole();

  return (
    <NavigationContainer theme={navTheme}>
      {role === 'customer' ? <CustomerNavigator /> : null}
      {role === 'kitchen' ? <KitchenNavigator /> : null}
      {role === 'instructor' ? <InstructorNavigator /> : null}
      {role === 'super' ? <SuperNavigator /> : null}
    </NavigationContainer>
  );
}
