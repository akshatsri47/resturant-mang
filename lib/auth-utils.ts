import { createClient } from '@/lib/supabase/server';
import { Role, StaffProfile } from '@/lib/types';

/**
 * Get the current user's staff profile (role + hotel_id)
 * Returns null if not authenticated
 */
export async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    ...profile,
    email: user.email,
  };
}

/**
 * Get redirect path based on role
 */
export function getDashboardPath(role: Role): string {
  switch (role) {
    case 'super_admin': return '/dashboard/super-admin';
    case 'admin': return '/dashboard/admin';
    case 'supervisor': return '/dashboard/supervisor';
    case 'reception': return '/dashboard/reception';
    case 'staff': return '/dashboard/staff';
    default: return '/dashboard';
  }
}

/**
 * Role permission checks
 */
export const Permissions = {
  canViewBilling: (role: Role) => ['admin', 'super_admin', 'reception', 'supervisor'].includes(role),
  canManageHotel: (role: Role) => ['admin', 'super_admin'].includes(role),
  canAssignRequests: (role: Role) => ['admin', 'supervisor', 'reception'].includes(role),
  canReassignRequests: (role: Role) => ['admin', 'supervisor'].includes(role),
  canApplyDiscount: (role: Role) => ['admin', 'super_admin'].includes(role),
  canVoidLineItem: (role: Role) => ['admin', 'super_admin'].includes(role),
  canCloseTab: (role: Role) => ['admin', 'reception'].includes(role),
  canViewAuditLog: (role: Role) => ['admin', 'super_admin'].includes(role),
  canManageAllHotels: (role: Role) => role === 'super_admin',
};
