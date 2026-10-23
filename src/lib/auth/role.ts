/**
 * Role resolution for role-based routing (ADR-0002).
 *
 * Temporary heuristic until the staff/patient role column lands in the database:
 * patient accounts are identified by an email containing "patient"; everyone
 * else is treated as clinic staff.
 */
export type AppRole = 'patient' | 'staff';

export function resolveRole(email: string | null | undefined): AppRole {
  return email?.toLowerCase().includes('patient') ? 'patient' : 'staff';
}

export function homePathForRole(role: AppRole): string {
  return role === 'patient' ? '/patient' : '/clinic';
}

export function homePathForEmail(email: string | null | undefined): string {
  return homePathForRole(resolveRole(email));
}
