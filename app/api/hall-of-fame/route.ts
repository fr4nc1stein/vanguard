/**
 * GET /api/hall-of-fame - Public leaderboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);

    const publicAwards = await db
      .select()
      .from(hallOfFame)
      .where(eq(hallOfFame.isPublic, 1))
      .orderBy(desc(hallOfFame.acceptedAt))
      .all();

    const leadersByResearcher = new Map<string, {
      researcherId: string;
      totalPoints: number;
      acceptedReports: number;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
      infoCount: number;
      firstReportAt: number | null;
      lastReportAt: number | null;
    }>();

    for (const award of publicAwards) {
      const leader = leadersByResearcher.get(award.researcherId) ?? {
        researcherId: award.researcherId,
        totalPoints: 0,
        acceptedReports: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        firstReportAt: null,
        lastReportAt: null,
      };

      leader.totalPoints += award.pointsAwarded;
      leader.acceptedReports += 1;
      if (award.severity === 'critical') leader.criticalCount += 1;
      if (award.severity === 'high') leader.highCount += 1;
      if (award.severity === 'medium') leader.mediumCount += 1;
      if (award.severity === 'low') leader.lowCount += 1;
      if (award.severity === 'informational') leader.infoCount += 1;
      leader.firstReportAt = leader.firstReportAt === null
        ? award.acceptedAt
        : Math.min(leader.firstReportAt, award.acceptedAt);
      leader.lastReportAt = leader.lastReportAt === null
        ? award.acceptedAt
        : Math.max(leader.lastReportAt, award.acceptedAt);

      leadersByResearcher.set(award.researcherId, leader);
    }

    const leaders = Array.from(leadersByResearcher.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 100);

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const leaderboardWithAvatars = await Promise.all(
      leaders.map(async (leader, index) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        
        try {
          const user = await clerk.users.getUser(leader.researcherId);
          researcherName = getDisplayName(user);
          avatarUrl = user.imageUrl;
        } catch (err) {
          // User not found or error fetching, use fallback
          console.warn(`[getLeaderboard] Failed to fetch Clerk data for ${leader.researcherId}:`, err);
        }
        
        return {
          rank: index + 1,
          researcherId: leader.researcherId,
          researcherName,
          avatarUrl,
          totalPoints: leader.totalPoints,
          acceptedReports: leader.acceptedReports,
          totalReports: leader.acceptedReports,
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
