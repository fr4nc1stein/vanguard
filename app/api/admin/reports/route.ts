/**
 * GET /api/admin/reports — Paginated report list (TRIAGER / ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and, like, sql, isNull } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { PaginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    await requireRole('TRIAGER');

    // Parse + validate query params
    const sp     = request.nextUrl.searchParams;
    const parsed = PaginationSchema.safeParse({
      page:       sp.get('page'),
      per_page:   sp.get('per_page'),
      status:     sp.get('status') ?? undefined,
      severity:   sp.get('severity') ?? undefined,
      target:     sp.get('target') ?? undefined,
      q:          sp.get('q') ?? undefined,
      assignedTo: sp.get('assigned_to') ?? undefined,
      unassigned: sp.get('unassigned') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
    }
    const { page = 1, per_page = 20, status, severity, target, q, assignedTo, unassigned } = parsed.data;

    const db = getDb(getCfEnv().DB);

    // Build where conditions
    const conditions = [];
    if (status)   conditions.push(eq(reports.status, status));
    if (severity) conditions.push(eq(reports.severity, severity));
    if (target)   conditions.push(eq(reports.target, target));
    if (assignedTo) conditions.push(eq(reports.assignedTo, assignedTo));
    if (unassigned === 'true') conditions.push(isNull(reports.assignedTo));
    if (q) {
      // Sanitize user input to prevent SQL injection via LIKE wildcards
      const sanitized = q.replace(/[%_\\]/g, '\\$&');
      conditions.push(like(reports.title, `%${sanitized}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRow] = await Promise.all([
      db.select({
        id:          reports.id,
        refId:       reports.refId,
        handle:      reports.handle,
        target:      reports.target,
        vulnType:    reports.vulnType,
        severity:    reports.severity,
        title:       reports.title,
        status:      reports.status,
        assignedTo:  reports.assignedTo,
        submittedAt: reports.submittedAt,
        updatedAt:   reports.updatedAt,
      })
        .from(reports)
        .where(where)
        .orderBy(desc(reports.submittedAt))
        .limit(per_page)
        .offset((page - 1) * per_page),

      db.select({ count: sql<number>`count(*)` }).from(reports).where(where).get(),
    ]);

    const total = countRow?.count ?? 0;

    return NextResponse.json({
      reports: rows,
      pagination: { page, per_page, total, pages: Math.ceil(total / per_page) },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/reports]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
