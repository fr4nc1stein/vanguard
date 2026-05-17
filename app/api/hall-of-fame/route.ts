/**
 * GET /api/hall-of-fame - Public leaderboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { researcherStats } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);
    
    const leaders = await db
      .select()
      .from(researcherStats)
      .orderBy(desc(researcherStats.totalPoints))
      .limit(100)
      .all();

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const leaderboardWithAvatars = await Promise.all(
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
          // User not found or error fetching, use stored name
          console.warn(`[getLeaderboard] Failed to fetch Clerk data for ${leader.researcherId}:`, err);
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
      leaderboard: leaderboardWithAvatars,
      total: leaderboardWithAvatars.length,
      period: 'all-time',
    });
  } catch (error) {
    console.error('[GET /api/hall-of-fame] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
