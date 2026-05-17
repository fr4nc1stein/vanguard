/**
 * PATCH /api/admin/hall-of-fame/[id]/visibility - Toggle hall of fame entry visibility
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const ToggleVisibilitySchema = z.object({
  isPublic: z.boolean(),
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

    const parsed = ToggleVisibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { isPublic } = parsed.data;
    const db = getDb(getCfEnv().DB);
    const now = Date.now();

    // Get current entry
    const entry = await db
      .select()
      .from(hallOfFame)
      .where(eq(hallOfFame.id, id))
      .get();

    if (!entry) {
      return NextResponse.json(
        { error: 'Hall of fame entry not found' },
        { status: 404 }
      );
    }

    // Update visibility
    await db
      .update(hallOfFame)
      .set({ isPublic: isPublic ? 1 : 0 })
      .where(eq(hallOfFame.id, id));

    // Log audit entry
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      reportId: entry.reportId,
      actorId: userId,
      actorEmail: null,
      action: 'hall_of_fame_visibility_toggled',
      oldValue: entry.isPublic ? 'public' : 'hidden',
      newValue: isPublic ? 'public' : 'hidden',
      ipHash: null,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      isPublic,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/admin/hall-of-fame/[id]/visibility] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
