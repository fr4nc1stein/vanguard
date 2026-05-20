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
  duplicateOf:    text('duplicate_of'), // Reference to original report ID
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

// ── Scopes (In-Scope Targets) ────────────────────────────────────────────────
export const scopes = sqliteTable('scopes', {
  id:          text('id').primaryKey(),
  domain:      text('domain').notNull(),
  description: text('description'),
  targetType:  text('target_type').notNull(), // 'web_app', 'api', 'mobile', 'infrastructure'
  status:      text('status').notNull(), // 'active', 'deprecated', 'out_of_scope'
  createdBy:   text('created_by').notNull(), // Clerk user ID
  createdAt:   integer('created_at').notNull(),
  updatedAt:   integer('updated_at').notNull(),
});

// ── Comments (Researcher-Triager Communication) ──────────────────────────────
export const comments = sqliteTable('comments', {
  id:         text('id').primaryKey(),
  reportId:   text('report_id').notNull(),
  authorId:   text('author_id').notNull(), // Clerk user ID
  authorRole: text('author_role').notNull(), // 'USER', 'TRIAGER', 'ADMIN'
  message:    text('message').notNull(),
  createdAt:  integer('created_at').notNull(),
});

// ── Points Configuration (Admin-managed) ─────────────────────────────────────
export const pointsConfig = sqliteTable('points_config', {
  id:        text('id').primaryKey(),
  severity:  text('severity').notNull().unique(),
  points:    integer('points').notNull(),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
});

// ── Researcher Stats (Auto-calculated) ───────────────────────────────────────
export const researcherStats = sqliteTable('researcher_stats', {
  researcherId:    text('researcher_id').primaryKey(), // Clerk user ID
  totalPoints:     integer('total_points').notNull().default(0),
  totalReports:    integer('total_reports').notNull().default(0),
  acceptedReports: integer('accepted_reports').notNull().default(0),
  criticalCount:   integer('critical_count').notNull().default(0),
  highCount:       integer('high_count').notNull().default(0),
  mediumCount:     integer('medium_count').notNull().default(0),
  lowCount:        integer('low_count').notNull().default(0),
  infoCount:       integer('info_count').notNull().default(0),
  firstReportAt:   integer('first_report_at'),
  lastReportAt:    integer('last_report_at'),
  updatedAt:       integer('updated_at').notNull(),
});

// ── Hall of Fame Entries (Public recognition) ────────────────────────────────
export const hallOfFame = sqliteTable('hall_of_fame', {
  id:             text('id').primaryKey(),
  reportId:       text('report_id').notNull().unique(),
  researcherId:   text('researcher_id').notNull(), // Clerk user ID
  title:          text('title').notNull(),
  severity:       text('severity').notNull(),
  pointsAwarded:  integer('points_awarded').notNull(),
  acceptedAt:     integer('accepted_at').notNull(),
  isPublic:       integer('is_public').notNull().default(1),
  createdAt:      integer('created_at').notNull(),
});

// ── Activity Feed (Hacktivity) ───────────────────────────────────────────────
export const hacktivity = sqliteTable('hacktivity', {
  id:             text('id').primaryKey(),
  reportId:       text('report_id').notNull(),
  researcherId:   text('researcher_id').notNull(), // Clerk user ID
  action:         text('action').notNull(),
  title:          text('title').notNull(),
  severity:       text('severity').notNull(),
  points:         integer('points'),
  titleDisclosed: integer('title_disclosed').notNull().default(0), // 0 = blurred, 1 = visible
  timestamp:      integer('timestamp').notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const reportsRelations = relations(reports, ({ many }) => ({
  auditLogs: many(auditLogs),
  comments: many(comments),
  hallOfFame: many(hallOfFame),
  hacktivity: many(hacktivity),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  report: one(reports, {
    fields: [comments.reportId],
    references: [reports.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  report: one(reports, {
    fields: [auditLogs.reportId],
    references: [reports.id],
  }),
}));

export const hallOfFameRelations = relations(hallOfFame, ({ one }) => ({
  report: one(reports, {
    fields: [hallOfFame.reportId],
    references: [reports.id],
  }),
}));

export const hacktivityRelations = relations(hacktivity, ({ one }) => ({
  report: one(reports, {
    fields: [hacktivity.reportId],
    references: [reports.id],
  }),
}));

// ── Inferred Types ────────────────────────────────────────────────────────────
export type Report           = typeof reports.$inferSelect;
export type NewReport        = typeof reports.$inferInsert;
export type AuditLog         = typeof auditLogs.$inferSelect;
export type NewAuditLog      = typeof auditLogs.$inferInsert;
export type Scope            = typeof scopes.$inferSelect;
export type NewScope         = typeof scopes.$inferInsert;
export type Comment          = typeof comments.$inferSelect;
export type NewComment       = typeof comments.$inferInsert;
export type PointsConfig     = typeof pointsConfig.$inferSelect;
export type NewPointsConfig  = typeof pointsConfig.$inferInsert;
export type ResearcherStats  = typeof researcherStats.$inferSelect;
export type NewResearcherStats = typeof researcherStats.$inferInsert;
export type HallOfFame       = typeof hallOfFame.$inferSelect;
export type NewHallOfFame    = typeof hallOfFame.$inferInsert;
export type Hacktivity       = typeof hacktivity.$inferSelect;
export type NewHacktivity    = typeof hacktivity.$inferInsert;

export type ReportStatus = 'new' | 'triaged' | 'accepted' | 'rejected' | 'fixed' | 'informational' | 'duplicate';
export type Severity     = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type UserRole     = 'USER' | 'TRIAGER' | 'ADMIN';
export type TargetType   = 'web_app' | 'api' | 'mobile' | 'infrastructure';
export type ScopeStatus  = 'active' | 'deprecated' | 'out_of_scope';
