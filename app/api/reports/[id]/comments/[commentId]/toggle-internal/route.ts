/**
 * PATCH /api/reports/[id]/comments/[commentId]/toggle-internal
 * Toggle internal flag on a comment (TRIAGER/ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { comments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    await requireRole('TRIAGER');
    const { commentId } = await context.params;
    
    const db = getDb(getCfEnv().DB);
    
    // Get current comment
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Toggle internal flag
    const newIsInternal = comment.isInternal === 1 ? 0 : 1;
    
    await db
      .update(comments)
      .set({ isInternal: newIsInternal })
      .where(eq(comments.id, commentId));
    
    return NextResponse.json({
      success: true,
      isInternal: newIsInternal === 1,
      message: newIsInternal === 1 ? 'Comment marked as internal' : 'Comment marked as public',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/reports/[id]/comments/[commentId]/toggle-internal]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
