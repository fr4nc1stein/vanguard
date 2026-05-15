import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ── Reports ───────────────────────────────────────────────────────────────────
export const reports = sqliteTable('reports', {
  id:             text('id').primaryKey(),
  refId:          text('ref_id').notNull().unique(),
  handle:         text('handle'),
  emailEncrypted: text('email_encrypted'),
  emailIv:        text('email_iv'),
  target:         text('target').notNull(),
  vulnType:       text('vuln_type').notNull(),
  severity:       text('severity').notNull(),
  title:          text('title').notNull(),
  bodyEncrypted:  text('body_encrypted').notNull(),
  bodyIv:         text('body_iv').notNull(),
  cvss:           text('cvss'),
  status:         text('status').notNull().default('new'),
  assignedTo:     text('assigned_to'),
  pocFiles:       text('poc_files').notNull().default('[]'),
  clerkUserId:    text('clerk_user_id'),
  ipHash:         text('ip_hash'),
  submittedAt:    integer('submitted_at').notNull(),
  updatedAt:      integer('updated_at').notNull(),
});

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogs = sqliteTable('audit_logs', {
  id:         text('id').primaryKey(),
  reportId:   text('report_id').notNull(),
  actorId:    text('actor_id').notNull(),
  actorEmail: text('actor_email'),
  action:     text('action').notNull(),
  oldValue:   text('old_value'),
  newValue:   text('new_value'),
  ipHash:     text('ip_hash'),
  timestamp:  integer('timestamp').notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const reportsRelations = relations(reports, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  report: one(reports, {
    fields: [auditLogs.reportId],
    references: [reports.id],
  }),
}));

// ── Inferred Types ────────────────────────────────────────────────────────────
export type Report        = typeof reports.$inferSelect;
export type NewReport     = typeof reports.$inferInsert;
export type AuditLog      = typeof auditLogs.$inferSelect;
export type NewAuditLog   = typeof auditLogs.$inferInsert;

export type ReportStatus = 'new' | 'triaged' | 'accepted' | 'rejected' | 'fixed' | 'informational';
export type Severity     = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type UserRole     = 'USER' | 'TRIAGER' | 'ADMIN';
