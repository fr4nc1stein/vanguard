/**
 * GET /api/admin/users/[id] — Get user info by Clerk user ID
 */
import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireRole } from '@/lib/auth';
import { getDisplayName } from '@/lib/redact';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('TRIAGER');
    const { id: userId } = await context.params;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    return NextResponse.json({
      id: user.id,
      name: getDisplayName(user),
      email: user.emailAddresses[0]?.emailAddress,
      banned: user.banned,
    });
  } catch (err) {
    console.error('[GET /api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}
