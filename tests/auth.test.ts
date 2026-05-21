/**
 * Unit tests for lib/auth.ts
 * Tests role hierarchy, hasRole function, and role checking logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasRole, getSessionRole, getSessionUserId, requireRole, UserRole } from '@/lib/auth';

// Mock Clerk modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: vi.fn(),
}));

describe('Auth Module', () => {
  describe('hasRole', () => {
    it('should return true when user role equals required role', () => {
      expect(hasRole('USER', 'USER')).toBe(true);
      expect(hasRole('TRIAGER', 'TRIAGER')).toBe(true);
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
    });

    it('should return true when user role is higher than required', () => {
      // ADMIN can do everything
      expect(hasRole('ADMIN', 'USER')).toBe(true);
      expect(hasRole('ADMIN', 'TRIAGER')).toBe(true);
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true);

      // TRIAGER can do USER and TRIAGER tasks
      expect(hasRole('TRIAGER', 'USER')).toBe(true);
      expect(hasRole('TRIAGER', 'TRIAGER')).toBe(true);
      expect(hasRole('TRIAGER', 'ADMIN')).toBe(false);
    });

    it('should return false when user role is lower than required', () => {
      // USER cannot do TRIAGER or ADMIN tasks
      expect(hasRole('USER', 'TRIAGER')).toBe(false);
      expect(hasRole('USER', 'ADMIN')).toBe(false);
    });

    it('should enforce role hierarchy: USER < TRIAGER < ADMIN', () => {
      // Test direct comparisons
      expect(hasRole('USER', 'USER')).toBe(true);
      expect(hasRole('USER', 'TRIAGER')).toBe(false);
      expect(hasRole('USER', 'ADMIN')).toBe(false);

      expect(hasRole('TRIAGER', 'USER')).toBe(true);
      expect(hasRole('TRIAGER', 'TRIAGER')).toBe(true);
      expect(hasRole('TRIAGER', 'ADMIN')).toBe(false);

      expect(hasRole('ADMIN', 'USER')).toBe(true);
      expect(hasRole('ADMIN', 'TRIAGER')).toBe(true);
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
    });
  });

  describe('Role Hierarchy Matrix', () => {
    const roles: UserRole[] = ['USER', 'TRIAGER', 'ADMIN'];

    it('should have correct number of roles', () => {
      expect(roles).toHaveLength(3);
    });

    it('should define complete role hierarchy', () => {
      roles.forEach(higherRole => {
        roles.forEach(lowerRole => {
          if (higherRole === lowerRole) {
            expect(hasRole(higherRole, lowerRole)).toBe(true);
          } else if (
            (higherRole === 'ADMIN') ||
            (higherRole === 'TRIAGER' && lowerRole === 'USER')
          ) {
            expect(hasRole(higherRole, lowerRole)).toBe(true);
          } else {
            expect(hasRole(higherRole, lowerRole)).toBe(false);
          }
        });
      });
    });
  });

  describe('getSessionRole', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return USER when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null });

      const role = await getSessionRole();
      expect(role).toBe('USER');
    });

    it('should return USER when role metadata is missing', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: {},
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const role = await getSessionRole();
      expect(role).toBe('USER');
    });

    it('should return the correct role when set in metadata', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');

      // Test ADMIN role
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'ADMIN' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      expect(await getSessionRole()).toBe('ADMIN');

      // Test TRIAGER role
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'TRIAGER' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      expect(await getSessionRole()).toBe('TRIAGER');

      // Test USER role
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'USER' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      expect(await getSessionRole()).toBe('USER');
    });

    it('should return USER when role is invalid', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'SUPERADMIN' }, // Invalid role
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const role = await getSessionRole();
      expect(role).toBe('USER');
    });

    it('should return USER when Clerk API fails', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockRejectedValue(new Error('Clerk API error')),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const role = await getSessionRole();
      expect(role).toBe('USER');
    });
  });

  describe('getSessionUserId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null });

      const userId = await getSessionUserId();
      expect(userId).toBeNull();
    });

    it('should return userId when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123456' });

      const userId = await getSessionUserId();
      expect(userId).toBe('user_123456');
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw 401 when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null });

      await expect(requireRole('USER')).rejects.toThrow();
      try {
        await requireRole('USER');
      } catch (error: unknown) {
        const response = error as Response;
        expect(response.status).toBe(401);
      }
    });

    it('should throw 403 when role is insufficient', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'USER' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      await expect(requireRole('TRIAGER')).rejects.toThrow();
      try {
        await requireRole('TRIAGER');
      } catch (error: unknown) {
        const response = error as Response;
        expect(response.status).toBe(403);
      }
    });

    it('should return user info when role is sufficient', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'ADMIN' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const result = await requireRole('USER');
      expect(result).toEqual({
        userId: 'user_admin',
        role: 'ADMIN',
      });
    });

    it('should allow ADMIN to access TRIAGER-restricted routes', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'ADMIN' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const result = await requireRole('TRIAGER');
      expect(result.role).toBe('ADMIN');
    });

    it('should allow TRIAGER to access USER-restricted routes', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: 'user_triager' });
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            publicMetadata: { role: 'TRIAGER' },
          }),
        },
      } as unknown as ReturnType<typeof clerkClient>);

      const result = await requireRole('USER');
      expect(result.role).toBe('TRIAGER');
    });
  });

  describe('Security Properties', () => {
    it('should never expose internal role hierarchy values', () => {
      // Verify hasRole only returns boolean
      const result = hasRole('ADMIN', 'USER');
      expect(typeof result).toBe('boolean');
    });

    it('should only accept valid role types', () => {
      // TypeScript should enforce this, but runtime test for completeness
      const validRoles: UserRole[] = ['USER', 'TRIAGER', 'ADMIN'];
      
      validRoles.forEach(role => {
        expect(hasRole(role, 'USER')).toBeDefined();
      });
    });
  });
});
