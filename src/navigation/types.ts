/**
 * Navigation param lists and screen-prop helpers for all four portals.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/* -------------------------------------------------------------- customer -- */

export type CustomerStackParamList = {
  Home: undefined;
  Kitchen: { slug: string };
  Cart: undefined;
  Bulk: { slug: string };
  OrderPlaced: { ref: string };
};

export type CustomerTabParamList = {
  HomeTab: undefined;
  WorkshopsTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

export type WorkshopStackParamList = {
  Workshops: undefined;
  WorkshopDetail: { id: string };
};

export type OrderStackParamList = {
  Orders: undefined;
  OrderDetail: { ref: string };
};

export type CustomerStackScreen<T extends keyof CustomerStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<CustomerStackParamList, T>,
  BottomTabScreenProps<CustomerTabParamList>
>;

export type WorkshopStackScreen<T extends keyof WorkshopStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<WorkshopStackParamList, T>,
  BottomTabScreenProps<CustomerTabParamList>
>;

export type OrderStackScreen<T extends keyof OrderStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<OrderStackParamList, T>,
  BottomTabScreenProps<CustomerTabParamList>
>;

/* --------------------------------------------------------- kitchen owner -- */

export type KitchenTabParamList = {
  Dashboard: undefined;
  Messages: undefined;
  Bulk: undefined;
  Orders: undefined;
  Slots: undefined;
  Menu: undefined;
  Settings: undefined;
};

export type KitchenTabScreen<T extends keyof KitchenTabParamList> = BottomTabScreenProps<
  KitchenTabParamList,
  T
>;

/* ------------------------------------------------------------ instructor -- */

export type InstructorTabParamList = {
  Dashboard: undefined;
  Workshops: undefined;
  Bookings: undefined;
};

export type InstructorTabScreen<T extends keyof InstructorTabParamList> = BottomTabScreenProps<
  InstructorTabParamList,
  T
>;

/* ----------------------------------------------------------- super admin -- */

export type SuperTabParamList = {
  Approvals: undefined;
  Business: undefined;
  Kitchens: undefined;
  Users: undefined;
  Curation: undefined;
};

export type SuperTabScreen<T extends keyof SuperTabParamList> = BottomTabScreenProps<
  SuperTabParamList,
  T
>;
