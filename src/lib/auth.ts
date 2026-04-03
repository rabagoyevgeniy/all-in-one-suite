import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';

const USER_ROLES: UserRole[] = [
  'admin',
  'head_manager',
  'personal_manager',
  'coach',
  'parent',
  'student',
  'pro_athlete',
];

const SELF_ASSIGNABLE_ROLES = ['parent', 'student', 'pro_athlete'] as const;

export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

export function readTrustedRoleFromUser(user: Pick<User, 'app_metadata'> | null | undefined): UserRole | null {
  const role = user?.app_metadata?.role;
  return isUserRole(role) ? role : null;
}

export function getSelfAssignableRole(
  user: Pick<User, 'user_metadata'> | null | undefined
): SelfAssignableRole | null {
  const role = user?.user_metadata?.signup_role;
  return typeof role === 'string' && SELF_ASSIGNABLE_ROLES.includes(role as SelfAssignableRole)
    ? (role as SelfAssignableRole)
    : null;
}
