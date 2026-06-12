/**
 * PATCH /api/admin/reports/bulk — Bulk status change or assignment
 *
 * Applies the action to each report where the transition is permitted.
 * Returns a summary of successes and skips.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { BulkActionSchema } from '@/lib/validation';
import { awardPoints } from '@/lib/services/hall-of-fame';
import type { ReportStatus } from '@/lib/db/schema';

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  new:           ['triaged', 'rejected', 'informational', 'duplicate'],
  triaged:       ['accepted', 'rejected', 'informational', 'duplicate'],
  accepted:      ['fixed', 'rejected'],
  rejected:      ['accepted', 'triaged'],
  fixed:         ['accepted'],
  informational: ['triaged', 'new'],
  duplicate:     ['triaged', 'new'],
};

export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await requireRole('TRIAGER');

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = BulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    const { reportIds, action, status: newStatus } = parsed.data;

    const db = getDb(getCfEnv().DB);
    const now = Date.now();
    const clientIp = request.headers.get('cf-connecting-ip') ?? undefined;

    const rows = await db.select().from(reports).where(inArray(reports.id, reportIds));

    let updated = 0;
    let skipped = 0;

    for (const report of rows) {
      if (action === 'set_status' && newStatus) {
        const currentStatus = report.status as ReportStatus;
        const allowed = ALLOWED_TRANSITIONS[currentStatus];
        if (role !== 'ADMIN' && !allowed.includes(newStatus)) {
          skipped++;
          continue;
        }
        if (currentStatus === newStatus) { skipped++; continue; }

        await db.update(reports)
          .set({ status: newStatus, updatedAt: now })
          .where(eq(reports.id, report.id));

        await logAudit({
          db, reportId: report.id, actorId: userId,
          action: 'bulk_status_changed',
          oldValue: currentStatus, newValue: newStatus,
          ipAddress: clientIp,
        });

        if (newStatus === 'accepted' || newStatus === 'fixed') {
          try {
            const awardResult = await awardPoints(report.id, userId);
            if (awardResult.error) {
              console.error(`[Bulk Auto-Award] Error: ${awardResult.error}`);
            }
          } catch (error) {
            console.error('[Bulk Auto-Award] Exception:', error);
          }
        }
        updated++;
      }

      if (action === 'assign_to_me') {
        if (report.assignedTo === userId) { skipped++; continue; }

        await db.update(reports)
          .set({ assignedTo: userId, updatedAt: now })
          .where(eq(reports.id, report.id));

        await logAudit({
          db, reportId: report.id, actorId: userId,
          action: 'bulk_assigned',
          newValue: userId, ipAddress: clientIp,
        });
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated, skipped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/reports/bulk]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
