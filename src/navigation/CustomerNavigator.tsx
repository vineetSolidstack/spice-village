/**
 * Customer app shell — four tabs, each wrapping its own stack.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChefHat, Home, Receipt, User } from 'lucide-react-native';

import { HomeScreen } from '../screens/customer/HomeScreen';
import { KitchenScreen } from '../screens/customer/KitchenScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { BulkScreen } from '../screens/customer/BulkScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { OrderDetailScreen } from '../screens/customer/OrderDetailScreen';
import { WorkshopsScreen } from '../screens/customer/WorkshopsScreen';
import { WorkshopDetailScreen } from '../screens/customer/WorkshopDetailScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { AboutScreen } from '../screens/customer/AboutScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { TabBar } from './TabBar';
import { useLanguage } from '../i18n';
import type {
  CustomerStackParamList,
  CustomerTabParamList,
  OrderStackParamList,
  ProfileStackParamList,
  WorkshopStackParamList,
} from './types';

const HomeStack = createNativeStackNavigator<CustomerStackParamList>();
const WorkshopStack = createNativeStackNavigator<WorkshopStackParamList>();
const OrderStack = createNativeStackNavigator<OrderStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<CustomerTabParamList>();

// Screens draw their own sticky headers, so the native header is always off.
const stackOptions = { headerShown: false } as const;

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Kitchen" component={KitchenScreen} />
      <HomeStack.Screen name="Cart" component={CartScreen} />
      <HomeStack.Screen name="Bulk" component={BulkScreen} />
      <HomeStack.Screen name="SignIn" component={SignInScreen} options={{ presentation: 'modal' }} />
    </HomeStack.Navigator>
  );
}

function WorkshopStackScreen() {
  return (
    <WorkshopStack.Navigator screenOptions={stackOptions}>
      <WorkshopStack.Screen name="Workshops" component={WorkshopsScreen} />
      <WorkshopStack.Screen name="WorkshopDetail" component={WorkshopDetailScreen} />
    </WorkshopStack.Navigator>
  );
}

function OrderStackScreen() {
  return (
    <OrderStack.Navigator screenOptions={stackOptions}>
      <OrderStack.Screen name="Orders" component={OrdersScreen} />
      <OrderStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrderStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={stackOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="About" component={AboutScreen} />
      <ProfileStack.Screen name="SignIn" component={SignInScreen} options={{ presentation: 'modal' }} />
    </ProfileStack.Navigator>
  );
}

export function CustomerNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: t.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="WorkshopsTab"
        component={WorkshopStackScreen}
        options={{
          tabBarLabel: t.workshops,
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrderStackScreen}
        options={{
          tabBarLabel: t.orders,
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: t.profile,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.75} />,
        }}
      />
    </Tab.Navigator>
  );
}
