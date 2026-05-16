/**
 * PATCH /api/admin/reports/[id]/status — Triage action (TRIAGER / ADMIN only)
 *
 * Allowed transitions:
 *  new        → triaged, rejected, informational
 *  triaged    → accepted, rejected, informational
 *  accepted   → fixed, rejected
 *  rejected   → accepted  (re-open)
 *  fixed      → (terminal — only admin can reopen)
 *  informational → (terminal)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole, getSessionEmail } from '@/lib/auth';
import { TriageUpdateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import type { ReportStatus } from '@/lib/db/schema';

// What each role can transition to
const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  new:           ['triaged', 'rejected', 'informational'],
  triaged:       ['accepted', 'rejected', 'informational'],
  accepted:      ['fixed', 'rejected'],
  rejected:      ['accepted', 'triaged'],
  fixed:         [],
  informational: ['triaged', 'new'], // Allow reopening informational reports
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, role } = await requireRole('TRIAGER');
    const { id } = await context.params;

    // Parse + validate
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = TriageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    const update = parsed.data;

    const db = getDb(getCfEnv().DB);

    // Fetch existing report
    const report = await db.select().from(reports).where(eq(reports.id, id)).get();
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const currentStatus = report.status as ReportStatus;
    const newStatus      = update.status;

    // Check allowed transition
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (role !== 'ADMIN' && !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Transition from '${currentStatus}' to '${newStatus}' is not permitted` },
        { status: 422 },
      );
    }

    const now = Date.now();
    const actorEmail = await getSessionEmail();
    const clientIp   = request.headers.get('cf-connecting-ip') ?? undefined;

    // Build update set
    const updateSet: Partial<typeof reports.$inferInsert> = {
      status:    newStatus,
      updatedAt: now,
    };
    if (update.assignedTo !== undefined) updateSet.assignedTo = update.assignedTo;
    if (update.severity   !== undefined) updateSet.severity   = update.severity;

    await db.update(reports).set(updateSet).where(eq(reports.id, id));

    // Audit: status change
    if (currentStatus !== newStatus) {
      await logAudit({
        db,
        reportId:   report.id,
        actorId:    userId,
        actorEmail,
        action:     'status_changed',
        oldValue:   currentStatus,
        newValue:   newStatus,
        ipAddress:  clientIp,
      });
    }

    // Audit: severity change
    if (update.severity && update.severity !== report.severity) {
      await logAudit({
        db,
        reportId:   report.id,
        actorId:    userId,
        actorEmail,
        action:     'severity_changed',
        oldValue:   report.severity,
        newValue:   update.severity,
        ipAddress:  clientIp,
      });
    }

    // Audit: assignment
    if (update.assignedTo && update.assignedTo !== report.assignedTo) {
      await logAudit({
        db,
        reportId:   report.id,
        actorId:    userId,
        actorEmail,
        action:     'assigned',
        newValue:   update.assignedTo,
        ipAddress:  clientIp,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/reports/[id]/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
