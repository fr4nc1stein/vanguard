/**
 * PATCH /api/reports/[id]/audit-logs/[logId]/toggle-internal
 * Toggle internal flag on an audit log (ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    await requireRole('ADMIN'); // Only admins can modify audit logs
    const { logId } = await context.params;
    
    const db = getDb(getCfEnv().DB);
    
    // Get current audit log
    const log = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, logId))
      .get();
    
    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }
    
    // Toggle internal flag
    const newIsInternal = log.isInternal === 1 ? 0 : 1;
    
    await db
      .update(auditLogs)
      .set({ isInternal: newIsInternal })
      .where(eq(auditLogs.id, logId));
    
    return NextResponse.json({
      success: true,
      isInternal: newIsInternal === 1,
      message: newIsInternal === 1 ? 'Audit log marked as internal' : 'Audit log marked as public',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/reports/[id]/audit-logs/[logId]/toggle-internal]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
