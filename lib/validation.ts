import { z } from 'zod';

// ── Constants ─────────────────────────────────────────────────────────────────

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
export type  Severity   = (typeof SEVERITIES)[number];

export const VALID_STATUSES = ['new', 'triaged', 'accepted', 'rejected', 'fixed', 'informational'] as const;
export type  ReportStatus   = (typeof VALID_STATUSES)[number];

export const TEMPLATE_CATEGORIES = ['triage', 'acceptance', 'rejection', 'info_request', 'general'] as const;
export type  TemplateCategory   = (typeof TEMPLATE_CATEGORIES)[number];

export const BOOTSTRAP_SCOPE_TARGETS = [
  'vanguard.laet4x.com',
  'laet4x.com',
] as const;

/**
 * Initial scope seed values retained for tests and bootstrap migrations only.
 * Runtime target validation is database-backed via the active `scopes` table.
 */
export const VALID_TARGETS = BOOTSTRAP_SCOPE_TARGETS;

export const VULN_TYPES = [
  'Broken Access Control',
  'Cryptographic Failure',
  'Injection (SQL / XSS / Command / SSTI)',
  'Insecure Design',
  'Security Misconfiguration',
  'Vulnerable or Outdated Component',
  'Authentication / Session Failure',
  'Software & Data Integrity Failure',
  'SSRF (Server-Side Request Forgery)',
  'Business Logic Flaw',
  'Information Disclosure / Data Leak',
  'IDOR (Insecure Direct Object Reference)',
  'Open Redirect',
  'Clickjacking / UI Redressing',
  'CORS Misconfiguration',
  'Path Traversal / File Inclusion',
  'Other',
] as const;

// ── Report Submission Schema ──────────────────────────────────────────────────

export const ReportSubmitSchema = z.object({
  handle:           z.string().max(60).optional(),
  email:            z.string().email().max(254).optional().or(z.literal('')),
  target:           z.string().max(200),
  vulnType:         z.string().max(100),
  severity:         z.enum(SEVERITIES),
  title:            z.string().min(10, 'Title must be at least 10 characters').max(200),
  description:      z.string().min(30, 'Description must be at least 30 characters').max(10_000),
  stepsToReproduce: z.string().min(20, 'Steps must be at least 20 characters').max(10_000),
  impact:           z.string().min(20, 'Impact must be at least 20 characters').max(5_000),
  cvss:             z.string().max(200).optional(),
  evidence:         z.string().max(2_000).optional(),
});

export type ReportSubmitInput = z.infer<typeof ReportSubmitSchema>;

// ── Triage Update Schema ──────────────────────────────────────────────────────

export const TriageUpdateSchema = z.object({
  status:     z.enum(VALID_STATUSES),
  assignedTo: z.string().max(100).nullable().optional(),
  comment:    z.string().max(2_000).nullable().optional(),
  severity:   z.enum(SEVERITIES).optional(), // allow triager to adjust severity
});

export type TriageUpdateInput = z.infer<typeof TriageUpdateSchema>;

// ── Presign Request Schema ────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
  'text/plain',
  'application/zip',
] as const;

export const PresignRequestSchema = z.object({
  filename:    z.string().min(1).max(200).regex(/^[\w\-. ]+$/, 'Invalid filename'),
  contentType: z.enum(ALLOWED_MIME_TYPES),
  size:        z.number().int().positive().max(50 * 1024 * 1024), // 50 MB max
});

export type PresignRequestInput = z.infer<typeof PresignRequestSchema>;

// ── Pagination Schema ─────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:        z.coerce.number().int().positive().optional(),
  per_page:    z.coerce.number().int().positive().max(100).optional(),
  status:      z.enum(VALID_STATUSES).optional(),
  severity:    z.enum(SEVERITIES).optional(),
  target:      z.string().max(255).optional(),
  q:           z.string().max(255).optional(),
  assignedTo:  z.string().email().optional(),
  unassigned:  z.string().optional(),
  clerkUserId: z.string().max(255).optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ── Response Template Schemas ─────────────────────────────────────────────────

export const TemplateCreateSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(100, 'Name too long'),
  category: z.enum(TEMPLATE_CATEGORIES),
  subject:  z.string().max(200, 'Subject too long').optional(),
  body:     z.string().min(10, 'Body must be at least 10 characters').max(5000, 'Body too long'),
});

export const TemplateUpdateSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  category:  z.enum(TEMPLATE_CATEGORIES).optional(),
  subject:   z.string().max(200).optional(),
  body:      z.string().min(10).max(5000).optional(),
  is_active: z.boolean().optional(),
});

export type TemplateCreateInput = z.infer<typeof TemplateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof TemplateUpdateSchema>;
