/**
 * GET  /api/admin/reports/[id]/labels — List labels on a report
 * POST /api/admin/reports/[id]/labels — Add a label to a report
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports, labels, reportLabels } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('TRIAGER');
    const { id } = await context.params;
    const db = getDb(getCfEnv().DB);

    const rows = await db
      .select({ label: labels })
      .from(reportLabels)
      .innerJoin(labels, eq(reportLabels.labelId, labels.id))
      .where(eq(reportLabels.reportId, id));

    return NextResponse.json({ labels: rows.map((r) => r.label) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/reports/[id]/labels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRole('TRIAGER');
    const { id } = await context.params;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { labelId } = body as { labelId?: string };
    if (!labelId) return NextResponse.json({ error: 'labelId required' }, { status: 400 });

    const db = getDb(getCfEnv().DB);

    const [report, label] = await Promise.all([
      db.select().from(reports).where(eq(reports.id, id)).get(),
      db.select().from(labels).where(eq(labels.id, labelId)).get(),
    ]);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (!label)  return NextResponse.json({ error: 'Label not found' }, { status: 404 });

    // Upsert — ignore if already attached
    const existing = await db
      .select()
      .from(reportLabels)
      .where(and(eq(reportLabels.reportId, id), eq(reportLabels.labelId, labelId)))
      .get();

    if (!existing) {
      await db.insert(reportLabels).values({
        reportId: id,
        labelId,
        addedBy:  userId,
        addedAt:  Date.now(),
      });

      await logAudit({
        db,
        reportId: id,
        actorId:  userId,
        action:   'label_added',
        newValue: label.name,
      });
    }

    return NextResponse.json({ success: true, label });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/reports/[id]/labels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
