/**
 * GET /api/hall-of-fame - Public leaderboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { researcherStats } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);
    
    const leaders = await db
      .select()
      .from(researcherStats)
      .orderBy(desc(researcherStats.totalPoints))
      .limit(100)
      .all();

    const leaderboard = leaders.map((leader, index) => ({
      rank: index + 1,
      researcherId: leader.researcherId,
      researcherName: leader.researcherName,
      avatarUrl: null, // Will use initials fallback in frontend
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
    }));

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('[GET /api/hall-of-fame] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
