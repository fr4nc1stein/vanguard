/**
 * lib/audit.ts — Immutable audit log helper
 *
 * Every status change, assignment, or sensitive action is recorded here
 * with actor identity, timestamp, and before/after values.
 */

import type { DbClient } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { hashValue } from '@/lib/crypto';

export type AuditAction =
  | 'report_submitted'
  | 'status_changed'
  | 'severity_changed'
  | 'assigned'
  | 'poc_uploaded'
  | 'report_viewed'
  | 'report_decrypted';

interface LogAuditParams {
  db:         DbClient;
  reportId:   string;
  actorId:    string;
  actorEmail?: string;
  action:     AuditAction;
  oldValue?:  string;
  newValue?:  string;
  ipAddress?: string;
}

/**
 * Appends an immutable record to the audit_logs table.
 * Never throws — audit failures must not break the main action.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const ipHash = params.ipAddress
      ? await hashValue(params.ipAddress)
      : undefined;

    await params.db.insert(auditLogs).values({
      id:         crypto.randomUUID(),
      reportId:   params.reportId,
      actorId:    params.actorId,
      actorEmail: params.actorEmail,
      action:     params.action,
      oldValue:   params.oldValue,
      newValue:   params.newValue,
      ipHash,
      timestamp:  Date.now(),
    });
  } catch (err) {
    // Audit failures are logged but never bubbled up
    console.error('[audit] Failed to write audit log:', err);
  }
}

/**
 * Retrieves the audit log for a specific report (most recent first).
 */
export async function getAuditLog(db: DbClient, reportId: string) {
  return db.query.auditLogs.findMany({
    where: (t, { eq }) => eq(t.reportId, reportId),
    orderBy: (t, { desc }) => [desc(t.timestamp)],
  });
}
