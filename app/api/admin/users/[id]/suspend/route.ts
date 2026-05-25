/**
 * POST /api/admin/users/[id]/suspend — Suspend or unsuspend a user via Clerk ban/unban
 *
 * Body: { suspend: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireRole, getSessionEmail } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const SuspendSchema = z.object({
  suspend: z.boolean(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: adminId } = await requireRole('ADMIN');
    const { id: targetUserId } = await context.params;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = SuspendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { suspend } = parsed.data;

    const client = await clerkClient();
    const targetUser = await client.users.getUser(targetUserId);
    const targetRole = (targetUser.publicMetadata as { role?: string })?.role || 'USER';

    if (targetUserId === adminId) {
      return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
    }

    if (targetRole === 'ADMIN') {
      return NextResponse.json({ error: 'Admin users cannot be suspended' }, { status: 403 });
    }

    if (suspend) {
      await client.users.banUser(targetUserId);
    } else {
      await client.users.unbanUser(targetUserId);
    }

    const adminEmail = await getSessionEmail();
    const db = getDb(getCfEnv().DB);
    await logAudit({
      db,
      entityType: 'user',
      entityId: targetUserId,
      actorId: adminId,
      actorEmail: adminEmail,
      action: suspend ? 'user_suspended' : 'user_unsuspended',
      oldValue: targetUser.banned ? 'suspended' : 'active',
      newValue: suspend ? 'suspended' : 'active',
    });

    return NextResponse.json({
      success: true,
      message: suspend ? 'User suspended' : 'User unsuspended',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/users/[id]/suspend]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
