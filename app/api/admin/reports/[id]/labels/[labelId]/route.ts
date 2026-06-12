/**
 * DELETE /api/admin/reports/[id]/labels/[labelId] — Remove a label from a report
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { labels, reportLabels } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; labelId: string }> },
) {
  try {
    const { userId } = await requireRole('TRIAGER');
    const { id, labelId } = await context.params;
    const db = getDb(getCfEnv().DB);

    const [existing, label] = await Promise.all([
      db.select().from(reportLabels).where(and(eq(reportLabels.reportId, id), eq(reportLabels.labelId, labelId))).get(),
      db.select().from(labels).where(eq(labels.id, labelId)).get(),
    ]);

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(reportLabels).where(
      and(eq(reportLabels.reportId, id), eq(reportLabels.labelId, labelId)),
    );

    await logAudit({
      db,
      reportId: id,
      actorId:  userId,
      action:   'label_removed',
      oldValue: label?.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/reports/[id]/labels/[labelId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
