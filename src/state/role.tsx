/**
 * Active portal.
 *
 * The handoff recommends shipping the kitchen-owner portal as a role switch
 * inside the same app rather than a separate binary; instructor and super-admin
 * are included here too so all four portals are reachable from one build.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

export type Role = 'customer' | 'kitchen' | 'instructor' | 'super';

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  kitchen: 'Kitchen owner',
  instructor: 'Instructor',
  super: 'Super admin',
};

type RoleValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('customer');
  const value = useMemo<RoleValue>(() => ({ role, setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>');
  return ctx;
}
