/**
 * GET /api/admin/activity-logs/export
 * Export activity logs as CSV
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCfEnv } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await requireRole('TRIAGER');

    const sp = request.nextUrl.searchParams;
    const action = sp.get('action');
    const actorId = role === 'ADMIN' ? sp.get('actor_id') : userId;
    const reportId = sp.get('report_id');
    const startDate = sp.get('start_date');
    const endDate = sp.get('end_date');

    const d1 = getCfEnv().DB;

    // Build WHERE conditions (same as main endpoint)
    const conditions: string[] = [];
    const params: any[] = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (actorId) {
      conditions.push('actor_id = ?');
      params.push(actorId);
    }

    if (reportId) {
      conditions.push('report_id = ?');
      params.push(reportId);
    }

    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      conditions.push('timestamp >= ?');
      params.push(startTimestamp);
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      conditions.push('timestamp <= ?');
      params.push(endTimestamp);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get all matching logs (no pagination for export)
    const query = `
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC
    `;
    const result = await d1.prepare(query).bind(...params).all();
    const logs = (result.results || []) as Array<{
      timestamp: number;
      action: string;
      actor_id: string;
      actor_email?: string;
      report_id?: string;
      old_value?: string;
      new_value?: string;
      ip_hash?: string;
    }>;

    // Generate CSV
    const headers = ['Timestamp', 'Action', 'Actor ID', 'Actor Email', 'Report ID', 'Old Value', 'New Value', 'IP Hash'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.actor_id,
        log.actor_email || '',
        log.report_id || '',
        (log.old_value || '').replace(/,/g, ';'), // Escape commas
        (log.new_value || '').replace(/,/g, ';'),
        log.ip_hash || '',
      ];
      csvRows.push(row.map(v => `"${v}"`).join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/activity-logs/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
