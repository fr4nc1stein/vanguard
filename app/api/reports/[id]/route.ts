/**
 * GET /api/reports/[id] — Fetch a single report (own only, or triager/admin)
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { decryptText } from '@/lib/crypto';
import { auth } from '@clerk/nextjs/server';
import { getSessionRole, hasRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const db = getDb(getCfEnv().DB);

    const report = await db.select().from(reports).where(eq(reports.id, id)).get();
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const role = await getSessionRole();
    const isOwner  = report.clerkUserId === userId;
    const isStaff  = hasRole(role, 'TRIAGER');

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Decrypt body (staff only — decryption is audited)
    let decryptedBody: Record<string, string> | null = null;
    if (isStaff) {
      const rawBody = await decryptText(report.bodyEncrypted, report.bodyIv);
      decryptedBody = JSON.parse(rawBody);
      await logAudit({ db, reportId: report.id, actorId: userId, action: 'report_decrypted' });
    }

    // Resolve PoC file keys (stored as JSON array, no R2 URLs)
    const pocKeys: string[] = JSON.parse(report.pocFiles || '[]');
    const pocUrls = pocKeys.map(key => ({ key, url: null }));

    return NextResponse.json({
      report: {
        id:          report.id,
        refId:       report.refId,
        handle:      report.handle,
        target:      report.target,
        vulnType:    report.vulnType,
        severity:    report.severity,
        title:       report.title,
        cvss:        report.cvss,
        status:      report.status,
        assignedTo:  report.assignedTo,
        submittedAt: report.submittedAt,
        updatedAt:   report.updatedAt,
        pocFiles:    pocUrls,
        // Only for staff
        ...(isStaff && decryptedBody ? { body: decryptedBody } : {}),
      },
    });
  } catch (err) {
    console.error('[GET /api/reports/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
