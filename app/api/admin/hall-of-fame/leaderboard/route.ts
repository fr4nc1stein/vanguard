/**
 * GET /api/admin/hall-of-fame/leaderboard - Admin leaderboard view
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { researcherStats } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const db = getDb(getCfEnv().DB);
    
    const leaders = await db
      .select()
      .from(researcherStats)
      .orderBy(desc(researcherStats.totalPoints))
      .limit(100)
      .all();

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const leaderboard = await Promise.all(
      leaders.map(async (leader, index) => {
        let researcherName = leader.researcherName;
        let avatarUrl = null;
        
        try {
          const user = await clerk.users.getUser(leader.researcherId);
          researcherName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.username || user.emailAddresses[0]?.emailAddress || leader.researcherName;
          avatarUrl = user.imageUrl;
        } catch (err) {
          console.warn(`[admin leaderboard] Failed to fetch Clerk data for ${leader.researcherId}:`, err);
        }
        
        return {
          rank: index + 1,
          researcherId: leader.researcherId,
          researcherName,
          avatarUrl,
          totalPoints: leader.totalPoints,
          acceptedReports: leader.acceptedReports,
          totalReports: leader.totalReports,
          criticalCount: leader.criticalCount,
          highCount: leader.highCount,
          mediumCount: leader.mediumCount,
          lowCount: leader.lowCount,
          infoCount: leader.infoCount,
          firstReportAt: leader.firstReportAt,
          lastReportAt: leader.lastReportAt,
        };
      })
    );

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/admin/hall-of-fame/leaderboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
