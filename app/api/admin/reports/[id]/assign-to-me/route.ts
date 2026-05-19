/**
 * PATCH /api/admin/reports/[id]/assign-to-me — Self-assign report (TRIAGER/ADMIN)
 * 
 * Allows triagers to quickly assign a report to themselves.
 * Admins can also use this, or use the regular assignment field to assign to others.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole, getSessionEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRole('TRIAGER');
    const { id } = await context.params;
    const { DB } = getCfEnv();
    const db = getDb(DB);

    // Get current user's email
    const actorEmail = await getSessionEmail();
    if (!actorEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Fetch the report
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if already assigned to someone else
    const wasAssigned = report.assignedTo;

    // Update assignment
    const now = Date.now();
    await db.update(reports)
      .set({
        assignedTo: actorEmail,
        updatedAt: now,
      })
      .where(eq(reports.id, id));

    // Audit log
    const clientIp = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     'unknown';

    await logAudit({
      db,
      reportId: report.id,
      actorId: userId,
      actorEmail,
      action: 'assigned',
      oldValue: wasAssigned || undefined,
      newValue: actorEmail,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      assignedTo: actorEmail,
      message: wasAssigned 
        ? `Report reassigned from ${wasAssigned} to you`
        : 'Report assigned to you',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/reports/[id]/assign-to-me]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
