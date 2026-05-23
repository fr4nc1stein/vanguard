/**
 * GET /api/admin/activity-logs
 * List all activity logs with filtering and pagination
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCfEnv } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN'); // Only admins can view activity logs

    const sp = request.nextUrl.searchParams;
    const action = sp.get('action');
    const actorId = sp.get('actor_id');
    const reportId = sp.get('report_id');
    const startDate = sp.get('start_date');
    const endDate = sp.get('end_date');
    const page = parseInt(sp.get('page') || '1');
    const limit = parseInt(sp.get('limit') || '50');
    const offset = (page - 1) * limit;

    const d1 = getCfEnv().DB;

    // Build WHERE conditions
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

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const countResult = await d1.prepare(countQuery).bind(...params).first() as { total: number } | null;
    const total = countResult?.total || 0;

    // Get paginated results
    const dataQuery = `
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const result = await d1.prepare(dataQuery).bind(...params, limit, offset).all();
    const logs = result.results || [];

    // Enrich logs with actor names from Clerk
    const enrichedLogs = await Promise.all(
      logs.map(async (log: any) => {
        let actorName = 'System';
        if (log.actor_id && log.actor_id.startsWith('user_')) {
          try {
            const client = await clerkClient();
            const actor = await client.users.getUser(log.actor_id);
            actorName = getDisplayName(actor);
          } catch (err) {
            console.warn('[GET /api/admin/activity-logs] Failed to fetch actor name:', err);
          }
        }
        return {
          ...log,
          actor_name: actorName,
        };
      })
    );

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/activity-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
