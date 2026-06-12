/**
 * DELETE /api/admin/saved-filters/[id] — Delete a saved filter (owner only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { savedFilters } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRole('TRIAGER');
    const { id } = await context.params;
    const db = getDb(getCfEnv().DB);

    const existing = await db
      .select()
      .from(savedFilters)
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)))
      .get();

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(savedFilters)
      .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/saved-filters/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
