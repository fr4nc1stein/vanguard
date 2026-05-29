/**
 * PATCH /api/admin/hall-of-fame/[id]/title - Override public-facing title for a hall of fame entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const UpdateTitleSchema = z.object({
  publicTitle: z.string().max(500).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireRole('ADMIN');
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = UpdateTitleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { publicTitle } = parsed.data;
    const db = getDb(getCfEnv().DB);
    const now = Date.now();

    const entry = await db
      .select()
      .from(hallOfFame)
      .where(eq(hallOfFame.id, id))
      .get();

    if (!entry) {
      return NextResponse.json({ error: 'Hall of fame entry not found' }, { status: 404 });
    }

    await db
      .update(hallOfFame)
      .set({ publicTitle })
      .where(eq(hallOfFame.id, id));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      reportId: entry.reportId,
      entityType: 'report',
      entityId: entry.reportId,
      actorId: userId,
      actorEmail: null,
      action: 'hall_of_fame_title_updated',
      oldValue: entry.publicTitle ?? entry.title,
      newValue: publicTitle ?? entry.title,
      ipHash: null,
      isInternal: 1,
      timestamp: now,
    });

    return NextResponse.json({ success: true, publicTitle });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/admin/hall-of-fame/[id]/title] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
