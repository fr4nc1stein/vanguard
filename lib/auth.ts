/**
 * lib/auth.ts — Clerk role helpers
 *
 * Roles are stored in Clerk's publicMetadata: { role: 'USER' | 'TRIAGER' | 'ADMIN' }
 * Set via Clerk dashboard → Users → select user → publicMetadata, or via the
 * Clerk Backend API: https://clerk.com/docs/references/backend/user/update-user
 *
 * Default role for new sign-ups: USER (set via Clerk webhook or middleware).
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import type { UserRole } from '@/lib/db/schema';

export { UserRole };

const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER:    1,
  TRIAGER: 2,
  ADMIN:   3,
};

/**
 * Extracts the role from the current Clerk session.
 * Falls back to USER if no role is set.
 */
export async function getSessionRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.publicMetadata as { role?: string } | undefined;
  const role = metadata?.role;
  
  // Debug logging
  console.log('[getSessionRole] sessionClaims:', JSON.stringify(sessionClaims, null, 2));
  console.log('[getSessionRole] publicMetadata:', JSON.stringify(metadata, null, 2));
  console.log('[getSessionRole] extracted role:', role);
  
  if (role === 'ADMIN' || role === 'TRIAGER' || role === 'USER') return role;
  
  console.warn('[getSessionRole] Invalid or missing role, defaulting to USER. Got:', role);
  return 'USER';
}

/**
 * Returns the current Clerk userId, or null if not authenticated.
 */
export async function getSessionUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Returns the current user's email for audit logs.
 */
export async function getSessionEmail(): Promise<string | undefined> {
  const user = await currentUser();
  return user?.emailAddresses?.[0]?.emailAddress;
}

/**
 * Throws a 403 Response if the current user's role is below the required level.
 */
export async function requireRole(required: UserRole): Promise<{ userId: string; role: UserRole }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const role = await getSessionRole();
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[required]) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return { userId, role };
}

/**
 * Checks if a role meets the minimum required level (no throw).
 */
export function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}
