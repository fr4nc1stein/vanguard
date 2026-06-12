/**
 * DELETE /api/admin/labels/[id] — Delete a label (ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { labels } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN');
    const { id } = await context.params;
    const db = getDb(getCfEnv().DB);

    const existing = await db.select().from(labels).where(eq(labels.id, id)).get();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(labels).where(eq(labels.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/labels/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
