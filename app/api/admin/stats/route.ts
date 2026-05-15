/**
 * GET /api/admin/stats — Aggregate stats for the admin dashboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    await requireRole('TRIAGER');

    const db = getDb(getCfEnv().DB);

    // Run all counts in a single batch for performance
    const [
      totalRow, newRow, triagedRow, acceptedRow, rejectedRow, fixedRow,
      criticalRow, highRow, mediumRow, lowRow,
    ] = await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(reports).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'new')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'triaged')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'accepted')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'rejected')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.status, 'fixed')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.severity, 'Critical')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.severity, 'High')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.severity, 'Medium')).get(),
      db.select({ n: sql<number>`count(*)` }).from(reports).where(eq(reports.severity, 'Low')).get(),
    ]);

    return NextResponse.json({
      total:    totalRow?.n    ?? 0,
      byStatus: {
        new:      newRow?.n      ?? 0,
        triaged:  triagedRow?.n  ?? 0,
        accepted: acceptedRow?.n ?? 0,
        rejected: rejectedRow?.n ?? 0,
        fixed:    fixedRow?.n    ?? 0,
      },
      bySeverity: {
        critical: criticalRow?.n ?? 0,
        high:     highRow?.n     ?? 0,
        medium:   mediumRow?.n   ?? 0,
        low:      lowRow?.n      ?? 0,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
