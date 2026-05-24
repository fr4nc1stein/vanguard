/**
 * Unit tests for lib/validation.ts
 * Tests Zod schemas for report submission, triage updates, and other inputs
 */

import { describe, it, expect } from 'vitest';
import {
  ReportSubmitSchema,
  TriageUpdateSchema,
  PresignRequestSchema,
  PaginationSchema,
  TemplateCreateSchema,
  TemplateUpdateSchema,
  SEVERITIES,
  VALID_STATUSES,
  TEMPLATE_CATEGORIES,
  BOOTSTRAP_SCOPE_TARGETS,
  VALID_TARGETS,
  VULN_TYPES,
} from '@/lib/validation';

describe('Validation Module', () => {
  describe('Constants', () => {
    describe('SEVERITIES', () => {
      it('should have exactly 5 severity levels', () => {
        expect(SEVERITIES).toHaveLength(5);
      });

      it('should have correct severity values', () => {
        expect(SEVERITIES).toEqual(['Critical', 'High', 'Medium', 'Low', 'Info']);
      });
    });

    describe('VALID_STATUSES', () => {
      it('should have 6 valid statuses', () => {
        expect(VALID_STATUSES).toHaveLength(6);
      });

      it('should have all expected status values', () => {
        expect(VALID_STATUSES).toEqual([
          'new', 'triaged', 'accepted', 'rejected', 'fixed', 'informational'
        ]);
      });
    });

    describe('TEMPLATE_CATEGORIES', () => {
      it('should have 5 template categories', () => {
        expect(TEMPLATE_CATEGORIES).toHaveLength(5);
      });

      it('should have all expected category values', () => {
        expect(TEMPLATE_CATEGORIES).toEqual([
          'triage', 'acceptance', 'rejection', 'info_request', 'general'
        ]);
      });
    });

    describe('BOOTSTRAP_SCOPE_TARGETS', () => {
      it('should have expected seed target domains', () => {
        expect(BOOTSTRAP_SCOPE_TARGETS).toContain('vanguard.laet4x.com');
        expect(BOOTSTRAP_SCOPE_TARGETS).toContain('laet4x.com');
      });

      it('should keep VALID_TARGETS as the deprecated bootstrap alias', () => {
        expect(VALID_TARGETS).toBe(BOOTSTRAP_SCOPE_TARGETS);
        expect(VALID_TARGETS).toContain('vanguard.laet4x.com');
        expect(VALID_TARGETS).toContain('laet4x.com');
      });
    });

    describe('VULN_TYPES', () => {
      it('should have vulnerability type categories', () => {
        expect(VULN_TYPES.length).toBeGreaterThan(10);
        expect(VULN_TYPES).toContain('Broken Access Control');
        expect(VULN_TYPES).toContain('Injection (SQL / XSS / Command / SSTI)');
      });
    });
  });

  describe('ReportSubmitSchema', () => {
    const validReport = {
      target: 'vanguard.laet4x.com',
      vulnType: 'Broken Access Control',
      severity: 'High',
      title: 'Authentication bypass in admin endpoint',
      description: 'Detailed description of the vulnerability that explains the security issue.',
      stepsToReproduce: 'Step 1: Navigate to the affected page. Step 2: Modify the request parameter.',
      impact: 'An attacker can gain unauthorized access to admin functionality.',
      cvss: '8.5',
      evidence: 'Screenshots attached',
    };

    it('should validate a complete valid report', () => {
      const result = ReportSubmitSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields omitted', () => {
      const minimalReport = {
        target: 'vanguard.laet4x.com',
        vulnType: 'XSS',
        severity: 'Medium',
        title: 'Stored XSS in comment field allows script injection',
        description: 'A stored XSS vulnerability exists in the user comment field.',
        stepsToReproduce: '1. Navigate to comments section. 2. Enter <script>alert(1)</script>.',
        impact: 'Attackers can execute arbitrary JavaScript in victim browsers.',
      };

      const result = ReportSubmitSchema.safeParse(minimalReport);
      expect(result.success).toBe(true);
    });

    it('should reject title shorter than 10 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        title: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        title: 'A'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject description shorter than 30 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        description: 'Too short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 10,000 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        description: 'A'.repeat(10_001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject stepsToReproduce shorter than 20 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        stepsToReproduce: 'Click submit',
      });
      expect(result.success).toBe(false);
    });

    it('should reject impact shorter than 20 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        impact: 'XSS attack possible',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid severity', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        severity: 'Urgent',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid severity levels', () => {
      for (const severity of SEVERITIES) {
        const result = ReportSubmitSchema.safeParse({
          ...validReport,
          severity,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject missing required fields', () => {
      const result = ReportSubmitSchema.safeParse({
        target: 'vanguard.laet4x.com',
      });
      expect(result.success).toBe(false);
    });

    it('should validate email format when provided', () => {
      const withValidEmail = {
        ...validReport,
        email: 'test@example.com',
      };
      expect(ReportSubmitSchema.safeParse(withValidEmail).success).toBe(true);

      const withInvalidEmail = {
        ...validReport,
        email: 'not-an-email',
      };
      expect(ReportSubmitSchema.safeParse(withInvalidEmail).success).toBe(false);
    });

    it('should accept empty string for email', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        email: '',
      });
      expect(result.success).toBe(true);
    });

    it('should reject email longer than 254 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        email: 'a'.repeat(250) + '@test.com',
      });
      expect(result.success).toBe(false);
    });

    it('should reject target longer than 200 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        target: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional handle field', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        handle: 'securityresearcher',
      });
      expect(result.success).toBe(true);
    });

    it('should reject handle longer than 60 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        handle: 'a'.repeat(61),
      });
      expect(result.success).toBe(false);
    });

    it('should reject cvss longer than 200 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        cvss: 'A'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject evidence longer than 2000 characters', () => {
      const result = ReportSubmitSchema.safeParse({
        ...validReport,
        evidence: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TriageUpdateSchema', () => {
    it('should validate valid triage update with status only', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
      });
      expect(result.success).toBe(true);
    });

    it('should validate triage update with all fields', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'accepted',
        assignedTo: 'admin@example.com',
        comment: 'Valid vulnerability confirmed.',
        severity: 'High',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid statuses', () => {
      for (const status of VALID_STATUSES) {
        const result = TriageUpdateSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });

    it('should accept null for assignedTo', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
        assignedTo: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null for comment', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'rejected',
        comment: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject comment longer than 2000 characters', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
        comment: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should allow severity adjustment by triager', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
        severity: 'Critical',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity in triage', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
        severity: 'SuperHigh',
      });
      expect(result.success).toBe(false);
    });

    it('should reject assignedTo longer than 100 characters', () => {
      const result = TriageUpdateSchema.safeParse({
        status: 'triaged',
        assignedTo: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PresignRequestSchema', () => {
    it('should validate valid presign request', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'screenshot.png',
        contentType: 'image/png',
        size: 1024 * 1024, // 1MB
      });
      expect(result.success).toBe(true);
    });

    it('should accept all allowed MIME types', () => {
      const allowedTypes = [
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf',
        'text/plain',
        'application/zip',
      ];

      for (const contentType of allowedTypes) {
        const result = PresignRequestSchema.safeParse({
          filename: 'file',
          contentType,
          size: 1024,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject disallowed MIME type', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'malware.exe',
        contentType: 'application/x-executable',
        size: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty filename', () => {
      const result = PresignRequestSchema.safeParse({
        filename: '',
        contentType: 'image/png',
        size: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('should reject filename with invalid characters', () => {
      const result = PresignRequestSchema.safeParse({
        filename: '../../../etc/passwd',
        contentType: 'text/plain',
        size: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('should accept filenames with allowed characters', () => {
      const validFilenames = [
        'file.txt',
        'my-document.pdf',
        'report-2024.doc',
        'data backup.tar.gz',
        'image with spaces.png',
      ];

      for (const filename of validFilenames) {
        const result = PresignRequestSchema.safeParse({
          filename,
          contentType: 'application/pdf',
          size: 1024,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject file size larger than 50MB', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'large-file.zip',
        contentType: 'application/zip',
        size: 50 * 1024 * 1024 + 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero file size', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'empty.txt',
        contentType: 'text/plain',
        size: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative file size', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'negative.txt',
        contentType: 'text/plain',
        size: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should accept filename longer than 200 characters', () => {
      const result = PresignRequestSchema.safeParse({
        filename: 'a'.repeat(201),
        contentType: 'text/plain',
        size: 1024,
      });
      expect(result.success).toBe(false); // Max 200
    });
  });

  describe('PaginationSchema', () => {
    it('should validate valid pagination params', () => {
      const result = PaginationSchema.safeParse({
        page: 1,
        per_page: 20,
        status: 'new',
        severity: 'High',
      });
      expect(result.success).toBe(true);
    });

    it('should accept string numbers (coerced)', () => {
      const result = PaginationSchema.safeParse({
        page: '5',
        per_page: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.per_page).toBe(50);
      }
    });

    it('should reject page less than 1', () => {
      const result = PaginationSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject per_page greater than 100', () => {
      const result = PaginationSchema.safeParse({
        per_page: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid statuses in pagination', () => {
      for (const status of VALID_STATUSES) {
        const result = PaginationSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should accept search query', () => {
      const result = PaginationSchema.safeParse({
        q: 'authentication bypass',
      });
      expect(result.success).toBe(true);
    });

    it('should reject query longer than 255 characters', () => {
      const result = PaginationSchema.safeParse({
        q: 'a'.repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it('should accept unassigned filter', () => {
      const result = PaginationSchema.safeParse({
        unassigned: 'true',
      });
      expect(result.success).toBe(true);
    });

    it('should validate assignedTo as email', () => {
      const result = PaginationSchema.safeParse({
        assignedTo: 'triager@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email for assignedTo', () => {
      const result = PaginationSchema.safeParse({
        assignedTo: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TemplateCreateSchema', () => {
    const validTemplate = {
      name: 'Initial Triage Response',
      category: 'triage' as const,
      subject: 'Report Received',
      body: 'Thank you for submitting your security report. We will review it shortly.',
    };

    it('should validate complete template', () => {
      const result = TemplateCreateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should allow optional subject', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        subject: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all template categories', () => {
      for (const category of TEMPLATE_CATEGORIES) {
        const result = TemplateCreateSchema.safeParse({
          ...validTemplate,
          category,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty name', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should reject body shorter than 10 characters', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        body: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject body longer than 5000 characters', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        body: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid category', () => {
      const result = TemplateCreateSchema.safeParse({
        ...validTemplate,
        category: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TemplateUpdateSchema', () => {
    it('should validate empty update (all fields optional)', () => {
      const result = TemplateUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate partial update', () => {
      const result = TemplateUpdateSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should validate update with all fields', () => {
      const result = TemplateUpdateSchema.safeParse({
        name: 'Updated Name',
        category: 'acceptance',
        subject: 'Updated Subject',
        body: 'Updated template body content.',
        is_active: false,
      });
      expect(result.success).toBe(true);
    });

    it('should validate boolean is_active field', () => {
      expect(TemplateUpdateSchema.safeParse({ is_active: true }).success).toBe(true);
      expect(TemplateUpdateSchema.safeParse({ is_active: false }).success).toBe(true);
    });
  });

  describe('Error Messages', () => {
    it('should provide specific error for short title', () => {
      const result = ReportSubmitSchema.safeParse({
        target: 'test.com',
        vulnType: 'XSS',
        severity: 'Low',
        title: 'Short',
        description: 'A very long description that meets the minimum requirements here.',
        stepsToReproduce: 'Steps to reproduce the vulnerability.',
        impact: 'Impact of the vulnerability on users.',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(e => e.path.includes('title'));
        expect(titleError?.message).toContain('at least 10 characters');
      }
    });

    it('should provide specific error for invalid email', () => {
      const result = ReportSubmitSchema.safeParse({
        target: 'test.com',
        vulnType: 'XSS',
        severity: 'Low',
        title: 'A valid title for testing',
        description: 'A valid description that meets requirements.',
        stepsToReproduce: 'Steps to reproduce this issue.',
        impact: 'Impact of this security issue.',
        email: 'not-valid',
      });

      expect(result.success).toBe(false);
    });
  });
});
