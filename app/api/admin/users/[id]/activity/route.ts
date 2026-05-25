/**
 * GET /api/admin/users/[id]/activity — Triager/admin action history
 *
 * Returns audit log entries where actorId = [id], ordered by timestamp desc.
 * Query params: page (default 1), per_page (default 20, max 50)
 */
import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { z } from 'zod';

const QuerySchema = z.object({
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().positive().max(50).optional().default(20),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
    const { id: actorId } = await context.params;

    const sp = request.nextUrl.searchParams;
    const parsed = QuerySchema.safeParse({
      page:     sp.get('page'),
      per_page: sp.get('per_page'),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
    }

    const { page, per_page } = parsed.data;
    const db = getDb(getCfEnv().DB);

    const rows = await db
      .select({
        id: auditLogs.id,
        reportId: auditLogs.reportId,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        oldValue: auditLogs.oldValue,
        newValue: auditLogs.newValue,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .where(eq(auditLogs.actorId, actorId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(per_page)
      .offset((page - 1) * per_page);

    return NextResponse.json({ activity: rows, page, per_page });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/users/[id]/activity]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
