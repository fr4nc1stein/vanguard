/**
 * PATCH /api/admin/hall-of-fame/[id]/points - Manually adjust points for a hall of fame entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, researcherStats, auditLogs, hacktivity } from '@/lib/db/schema';
import { eq, sum } from 'drizzle-orm';
import { z } from 'zod';

const AdjustPointsSchema = z.object({
  points: z.number().int().min(0).max(10000),
  reason: z.string().trim().min(1).max(500),
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

    const parsed = AdjustPointsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { points, reason } = parsed.data;
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

    const oldPoints = entry.pointsAwarded;

    await db
      .update(hallOfFame)
      .set({ pointsAwarded: points })
      .where(eq(hallOfFame.id, id));

    await db
      .update(hacktivity)
      .set({ points })
      .where(eq(hacktivity.reportId, entry.reportId));

    // Recalculate researcher total from all their entries to avoid drift
    const result = await db
      .select({ total: sum(hallOfFame.pointsAwarded) })
      .from(hallOfFame)
      .where(eq(hallOfFame.researcherId, entry.researcherId))
      .get();

    const newTotal = Number(result?.total ?? 0);

    await db
      .update(researcherStats)
      .set({ totalPoints: newTotal, updatedAt: now })
      .where(eq(researcherStats.researcherId, entry.researcherId));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      reportId: entry.reportId,
      entityType: 'report',
      entityId: entry.reportId,
      actorId: userId,
      actorEmail: null,
      action: 'points_manually_adjusted',
      oldValue: String(oldPoints),
      newValue: JSON.stringify({ points, reason }),
      ipHash: null,
      isInternal: 1,
      timestamp: now,
    });

    return NextResponse.json({ success: true, points, researcherTotalPoints: newTotal });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/admin/hall-of-fame/[id]/points] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
