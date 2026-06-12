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
  | 'report_decrypted'
  | 'role_changed'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'comment_posted'
  | 'scope_created'
  | 'scope_updated'
  | 'scope_archived'
  | 'template_used'
  | 'label_added'
  | 'label_removed'
  | 'bulk_status_changed'
  | 'bulk_assigned';

// Internal actions that should only be visible to triagers/admins
const INTERNAL_ACTIONS: AuditAction[] = [
  'assigned',
  'severity_changed',
  'role_changed',
  'user_suspended',
  'user_unsuspended',
];

interface LogAuditParams {
  db:         DbClient;
  reportId?:  string;
  entityType?: 'report' | 'user' | 'system';
  entityId?:   string;
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

    // Determine if this action should be internal-only
    const isInternal = INTERNAL_ACTIONS.includes(params.action) ? 1 : 0;
    const entityType = params.entityType ?? (params.reportId ? 'report' : 'system');
    const entityId = params.entityId ?? params.reportId ?? entityType;

    await params.db.insert(auditLogs).values({
      id:         crypto.randomUUID(),
      reportId:   entityType === 'report' ? params.reportId : null,
      entityType,
      entityId,
      actorId:    params.actorId,
      actorEmail: params.actorEmail,
      action:     params.action,
      oldValue:   params.oldValue,
      newValue:   params.newValue,
      ipHash,
      isInternal,
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
