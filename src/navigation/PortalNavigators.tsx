/**
 * Tab shells for the three partner portals.
 * Icons are 2px stroke at 16–18pt on admin surfaces, per the iconography spec.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ChefHat,
  Clock,
  LayoutGrid,
  Receipt,
  Settings,
  Shield,
  SlidersHorizontal,
  Star,
  Store,
  UtensilsCrossed,
  Users,
} from 'lucide-react-native';

import { KitchenDashboardScreen } from '../screens/kitchen/DashboardScreen';
import { KitchenOrdersScreen } from '../screens/kitchen/OrdersScreen';
import { KitchenSlotsScreen } from '../screens/kitchen/SlotsScreen';
import { KitchenMenuScreen } from '../screens/kitchen/MenuScreen';
import { KitchenSettingsScreen } from '../screens/kitchen/SettingsScreen';
import {
  InstructorBookingsScreen,
  InstructorDashboardScreen,
  InstructorWorkshopsScreen,
} from '../screens/instructor/InstructorScreens';
import { SuperBusinessScreen } from '../screens/super/BusinessScreen';
import {
  SuperApprovalsScreen,
  SuperCurationScreen,
  SuperKitchensScreen,
  SuperUsersScreen,
} from '../screens/super/SuperScreens';
import { TabBar } from './TabBar';
import type { InstructorTabParamList, KitchenTabParamList, SuperTabParamList } from './types';

const KitchenTab = createBottomTabNavigator<KitchenTabParamList>();
const InstructorTab = createBottomTabNavigator<InstructorTabParamList>();
const SuperTab = createBottomTabNavigator<SuperTabParamList>();

const ADMIN_STROKE = 2;
const tabOptions = { headerShown: false } as const;

export function KitchenNavigator() {
  return (
    <KitchenTab.Navigator screenOptions={tabOptions} tabBar={(props) => <TabBar {...props} />}>
      <KitchenTab.Screen
        name="Dashboard"
        component={KitchenDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <KitchenTab.Screen
        name="Orders"
        component={KitchenOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Receipt size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <KitchenTab.Screen
        name="Slots"
        component={KitchenSlotsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Clock size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <KitchenTab.Screen
        name="Menu"
        component={KitchenMenuScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <UtensilsCrossed size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <KitchenTab.Screen
        name="Settings"
        component={KitchenSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
    </KitchenTab.Navigator>
  );
}

export function InstructorNavigator() {
  return (
    <InstructorTab.Navigator screenOptions={tabOptions} tabBar={(props) => <TabBar {...props} />}>
      <InstructorTab.Screen
        name="Dashboard"
        component={InstructorDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <InstructorTab.Screen
        name="Workshops"
        component={InstructorWorkshopsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ChefHat size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <InstructorTab.Screen
        name="Bookings"
        component={InstructorBookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
    </InstructorTab.Navigator>
  );
}

export function SuperNavigator() {
  return (
    <SuperTab.Navigator screenOptions={tabOptions} tabBar={(props) => <TabBar {...props} />}>
      <SuperTab.Screen
        name="Approvals"
        component={SuperApprovalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Shield size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <SuperTab.Screen
        name="Kitchens"
        component={SuperKitchensScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Store size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <SuperTab.Screen
        name="Users"
        component={SuperUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <SuperTab.Screen
        name="Business"
        component={SuperBusinessScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SlidersHorizontal size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
      <SuperTab.Screen
        name="Curation"
        component={SuperCurationScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Star size={size} color={color} strokeWidth={ADMIN_STROKE} />
          ),
        }}
      />
    </SuperTab.Navigator>
  );
}
