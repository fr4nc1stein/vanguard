/**
 * GET /api/admin/users — List all Clerk users
 * PATCH /api/admin/users — Update user role
 */
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

// GET - List all users
export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || null,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: (user.publicMetadata as { role?: string })?.role || 'USER',
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      imageUrl: user.imageUrl,
    }));

    return NextResponse.json({
      users: formattedUsers,
      total: users.length,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/users] Error:', err);
    console.error('[GET /api/admin/users] Error stack:', err instanceof Error ? err.stack : 'No stack');
    console.error('[GET /api/admin/users] Error message:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

// PATCH - Update user role
const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['USER', 'TRIAGER', 'ADMIN']),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId: adminId } = await requireRole('ADMIN');

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { userId, role } = parsed.data;

    // Update user role in Clerk
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role },
    });

    // Log the role change (optional - could add to audit_logs)
    console.log(`[ADMIN] User ${userId} role changed to ${role} by ${adminId}`);

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
