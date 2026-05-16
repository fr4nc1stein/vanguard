/**
 * GET /api/admin/analytics — Analytics metrics and data
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { sql, eq, and, gte } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    await requireRole('TRIAGER'); // Both TRIAGER and ADMIN can view analytics

    const db = getDb(getCfEnv().DB);
    const sp = request.nextUrl.searchParams;
    const days = parseInt(sp.get('days') || '30', 10);
    
    // Calculate timestamp for date range (last N days)
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get all reports for analysis
    const allReports = await db.select().from(reports).all();
    const recentReports = allReports.filter(r => r.submittedAt >= startDate);

    // Total counts
    const totalReports = allReports.length;
    const recentReportsCount = recentReports.length;

    // Status distribution
    const statusCounts = allReports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Severity distribution
    const severityCounts = allReports.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Reports by target
    const targetCounts = allReports.reduce((acc, r) => {
      acc[r.target] = (acc[r.target] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top targets (sorted by count)
    const topTargets = Object.entries(targetCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([target, count]) => ({ target, count }));

    // Reports over time (grouped by day for last N days)
    const reportsOverTime: Record<string, number> = {};
    recentReports.forEach(r => {
      const date = new Date(r.submittedAt).toISOString().split('T')[0];
      reportsOverTime[date] = (reportsOverTime[date] || 0) + 1;
    });

    // Fill in missing dates with 0
    const timeSeriesData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      timeSeriesData.push({
        date,
        count: reportsOverTime[date] || 0,
      });
    }

    // Top reporters (by number of submissions)
    // Group by clerkUserId to get accurate counts per user
    const reporterCounts = allReports.reduce((acc, r) => {
      const userId = r.clerkUserId || 'anonymous';
      if (!acc[userId]) {
        acc[userId] = { count: 0, handle: r.handle || 'Anonymous' };
      }
      acc[userId].count += 1;
      return acc;
    }, {} as Record<string, { count: number; handle: string }>);

    // Get top 10 reporter user IDs
    const topReporterIds = Object.entries(reporterCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    // Fetch Clerk user names for authenticated reporters
    const client = await clerkClient();
    const topReporters = await Promise.all(
      topReporterIds.map(async ([userId, data]) => {
        if (userId === 'anonymous') {
          return { handle: 'Anonymous', count: data.count };
        }
        try {
          const user = await client.users.getUser(userId);
          const name = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.username || user.emailAddresses[0]?.emailAddress || data.handle;
          return { handle: name, count: data.count };
        } catch (err) {
          // If user not found in Clerk, use handle from report
          return { handle: data.handle, count: data.count };
        }
      })
    );

    // Average response time (for resolved reports)
    const resolvedReports = allReports.filter(r => 
      r.status === 'resolved' || r.status === 'accepted' || r.status === 'duplicate'
    );
    
    let avgResponseTime = 0;
    if (resolvedReports.length > 0) {
      const totalResponseTime = resolvedReports.reduce((sum, r) => {
        // Approximate response time as updatedAt - submittedAt
        return sum + (r.updatedAt - r.submittedAt);
      }, 0);
      avgResponseTime = Math.round(totalResponseTime / resolvedReports.length / (1000 * 60 * 60)); // Convert to hours
    }

    return NextResponse.json({
      summary: {
        totalReports,
        recentReports: recentReportsCount,
        avgResponseTimeHours: avgResponseTime,
        resolvedCount: resolvedReports.length,
      },
      statusDistribution: statusCounts,
      severityDistribution: severityCounts,
      topTargets,
      topReporters,
      timeSeriesData,
      dateRange: {
        days,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/analytics]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
