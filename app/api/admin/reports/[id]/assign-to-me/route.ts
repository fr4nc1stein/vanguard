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
import { requireRole } from '@/lib/auth';
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

    // Fetch the report
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if already assigned to someone else
    const wasAssigned = report.assignedTo;

    // Update assignment - use Clerk user ID instead of email
    const now = Date.now();
    await db.update(reports)
      .set({
        assignedTo: userId, // Store Clerk user ID
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
      action: 'assigned',
      oldValue: wasAssigned || undefined,
      newValue: userId, // Log user ID instead of email
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      assignedTo: userId,
      message: wasAssigned 
        ? 'Report reassigned to you'
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
