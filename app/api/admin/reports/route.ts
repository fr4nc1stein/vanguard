/**
 * GET /api/admin/reports — Paginated report list (TRIAGER / ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and, like, sql, isNull, inArray } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports, labels, reportLabels } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { PaginationSchema } from '@/lib/validation';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(request: NextRequest) {
  try {
    await requireRole('TRIAGER');

    // Parse + validate query params
    const sp     = request.nextUrl.searchParams;
    const parsed = PaginationSchema.safeParse({
      page:        sp.get('page'),
      per_page:    sp.get('per_page'),
      status:      sp.get('status') ?? undefined,
      severity:    sp.get('severity') ?? undefined,
      target:      sp.get('target') ?? undefined,
      q:           sp.get('q') ?? undefined,
      assignedTo:  sp.get('assigned_to') ?? undefined,
      unassigned:  sp.get('unassigned') ?? undefined,
      clerkUserId: sp.get('clerk_user_id') ?? undefined,
      labelId:     sp.get('label_id') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
    }
    const { page = 1, per_page = 20, status, severity, target, q, assignedTo, unassigned, clerkUserId, labelId } = parsed.data;

    const db = getDb(getCfEnv().DB);

    // If filtering by label, resolve to matching report IDs first
    let labelReportIds: string[] | null = null;
    if (labelId) {
      const labelRows = await db
        .select({ reportId: reportLabels.reportId })
        .from(reportLabels)
        .where(eq(reportLabels.labelId, labelId));
      labelReportIds = labelRows.map((r) => r.reportId);
      if (labelReportIds.length === 0) {
        return NextResponse.json({
          reports: [],
          pagination: { page, per_page, total: 0, pages: 0 },
        });
      }
    }

    // Build where conditions
    const conditions = [];
    if (status)   conditions.push(eq(reports.status, status));
    if (severity) conditions.push(eq(reports.severity, severity));
    if (target)   conditions.push(eq(reports.target, target));
    if (assignedTo) conditions.push(eq(reports.assignedTo, assignedTo));
    if (unassigned === 'true') conditions.push(isNull(reports.assignedTo));
    if (clerkUserId) conditions.push(eq(reports.clerkUserId, clerkUserId));
    if (labelReportIds) conditions.push(inArray(reports.id, labelReportIds));
    if (q) {
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

    // Fetch labels for this page of reports in one query
    const reportIds = rows.map((r) => r.id);
    const labelRows = reportIds.length > 0
      ? await db
          .select({ reportId: reportLabels.reportId, label: labels })
          .from(reportLabels)
          .innerJoin(labels, eq(reportLabels.labelId, labels.id))
          .where(inArray(reportLabels.reportId, reportIds))
      : [];

    const labelsByReportId: Record<string, { id: string; name: string; color: string }[]> = {};
    for (const row of labelRows) {
      if (!labelsByReportId[row.reportId]) labelsByReportId[row.reportId] = [];
      labelsByReportId[row.reportId].push(row.label);
    }

    // Enrich reports with triager names from Clerk
    const enrichedReports = await Promise.all(
      rows.map(async (report) => {
        let assignedToName = report.assignedTo;
        if (report.assignedTo && report.assignedTo.startsWith('user_')) {
          try {
            const client = await clerkClient();
            const triager = await client.users.getUser(report.assignedTo);
            assignedToName = getDisplayName(triager);
          } catch (err) {
            console.warn('[GET /api/admin/reports] Failed to fetch triager name:', err);
          }
        }
        return {
          ...report,
          assignedTo: assignedToName,
          labels: labelsByReportId[report.id] ?? [],
        };
      })
    );

    return NextResponse.json({
      reports: enrichedReports,
      pagination: { page, per_page, total, pages: Math.ceil(total / per_page) },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/reports]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
