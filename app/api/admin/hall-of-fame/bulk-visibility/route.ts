/**
 * PATCH /api/admin/hall-of-fame/bulk-visibility - Set visibility for multiple entries at once
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, auditLogs } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

const BulkVisibilitySchema = z.object({
  ids: z.array(z.string()).min(1).max(250),
  isPublic: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireRole('ADMIN');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = BulkVisibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { ids, isPublic } = parsed.data;
    const db = getDb(getCfEnv().DB);
    const now = Date.now();

    const existingEntries = await db
      .select()
      .from(hallOfFame)
      .where(inArray(hallOfFame.id, ids))
      .all();

    if (existingEntries.length === 0) {
      return NextResponse.json({ error: 'No entries found' }, { status: 404 });
    }

    await db
      .update(hallOfFame)
      .set({ isPublic: isPublic ? 1 : 0 })
      .where(inArray(hallOfFame.id, ids));

    for (const entry of existingEntries) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        reportId: entry.reportId,
        entityType: 'report',
        entityId: entry.reportId,
        actorId: userId,
        actorEmail: null,
        action: 'hall_of_fame_visibility_toggled',
        oldValue: entry.isPublic ? 'public' : 'hidden',
        newValue: isPublic ? 'public' : 'hidden',
        ipHash: null,
        isInternal: 0,
        timestamp: now,
      });
    }

    return NextResponse.json({ success: true, updated: existingEntries.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/admin/hall-of-fame/bulk-visibility] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
