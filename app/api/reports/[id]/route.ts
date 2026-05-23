/**
 * GET /api/reports/[id] — Fetch a single report (own only, or triager/admin)
 * 
 * SECURITY: The assigned_to field (triager email) is only visible to staff members.
 * Report owners (researchers) should not see who is assigned to triage their report
 * to maintain investigator anonymity until the report is resolved.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { decryptText } from '@/lib/crypto';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getSessionRole, hasRole } from '@/lib/auth';
import { logAudit, getAuditLog } from '@/lib/audit';
import { getDisplayName } from '@/lib/redact';

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

    // Decrypt body (owner or staff can view)
    let decryptedBody: Record<string, string> | null = null;
    if (isOwner || isStaff) {
      const rawBody = await decryptText(report.bodyEncrypted, report.bodyIv);
      decryptedBody = JSON.parse(rawBody);
      // No audit logging for decryption - it's automatic when viewing reports
    }

    // Resolve PoC file keys (stored as JSON array, no R2 URLs)
    const pocKeys: string[] = JSON.parse(report.pocFiles || '[]');

    // Get audit logs
    const allAuditLogs = await getAuditLog(db, report.id);
    
    // Filter internal logs for non-staff users
    const auditLogs = isStaff 
      ? allAuditLogs 
      : allAuditLogs.filter(log => log.isInternal === 0);

    // Fetch reporter name from Clerk if staff
    let reporterName = report.handle || 'Anonymous';
    if (isStaff && report.clerkUserId) {
      try {
        const client = await clerkClient();
        const reporter = await client.users.getUser(report.clerkUserId);
        reporterName = getDisplayName(reporter);
      } catch (err) {
        console.warn('[GET /api/reports/[id]] Failed to fetch reporter name:', err);
      }
    }

    // Enrich audit logs with user names from Clerk
    const enrichedAuditLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let actorName = 'System';
        if (log.actorId && log.actorId.startsWith('user_')) {
          try {
            const client = await clerkClient();
            const actor = await client.users.getUser(log.actorId);
            actorName = getDisplayName(actor);
          } catch (err) {
            // Fallback to System if Clerk fetch fails
            console.warn('[GET /api/reports/[id]] Failed to fetch actor name:', err);
          }
        }
        return {
          id:         log.id,
          action:     log.action,
          actor_name: actorName,
          old_value:  log.oldValue,
          new_value:  log.newValue,
          timestamp:  new Date(log.timestamp).toISOString(),
        };
      })
    );

    // Format body for display
    const bodyText = decryptedBody 
      ? `${decryptedBody.description}\n\n## Steps to Reproduce\n${decryptedBody.stepsToReproduce}\n\n## Impact\n${decryptedBody.impact}${decryptedBody.evidence ? `\n\n## Evidence\n${decryptedBody.evidence}` : ''}`
      : null;

    // SECURITY: Only reveal assigned_to to staff, not to report owner
    // Researchers should not know who is triaging their report
    let assignedTo: string | null = null;
    if (isStaff && report.assignedTo) {
      // Fetch triager name from Clerk instead of showing email
      try {
        const client = await clerkClient();
        const users = await client.users.getUserList({ emailAddress: [report.assignedTo] });
        if (users.data && users.data.length > 0) {
          assignedTo = getDisplayName(users.data[0]);
        } else {
          assignedTo = report.assignedTo; // Fallback to email if not found
        }
      } catch (err) {
        console.warn('[GET /api/reports/[id]] Failed to fetch triager name:', err);
        assignedTo = report.assignedTo; // Fallback to email on error
      }
    }

    return NextResponse.json({
      data: {
        id:          report.id,
        ref_id:      report.refId,
        handle:      reporterName,
        target:      report.target,
        vuln_type:   report.vulnType,
        severity:    report.severity,
        title:       report.title,
        body:        bodyText,
        cvss:        report.cvss,
        status:      report.status,
        assigned_to: assignedTo,
        poc_files:   pocKeys,
        created_at:  new Date(report.submittedAt).toISOString(),
        updated_at:  new Date(report.updatedAt).toISOString(),
        audit_logs:  enrichedAuditLogs,
      },
    });
  } catch (err) {
    console.error('[GET /api/reports/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
