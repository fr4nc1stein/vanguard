/**
 * GET /api/hall-of-fame/stats - Overall statistics
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { researcherStats, hallOfFame } from '@/lib/db/schema';
import { desc, gte } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);

    // Get all stats
    const allStats = await db.select().from(researcherStats).all();
    const allAwards = await db.select().from(hallOfFame).all();

    // Calculate totals
    const totalPointsAwarded = allStats.reduce((sum, stat) => sum + stat.totalPoints, 0);
    const totalResearchers = allStats.length;
    const totalReportsAccepted = allAwards.length;
    const averagePointsPerReport = totalReportsAccepted > 0 
      ? Math.round(totalPointsAwarded / totalReportsAccepted)
      : 0;

    // Get top researcher this month
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentAwards = await db
      .select()
      .from(hallOfFame)
      .where(gte(hallOfFame.acceptedAt, thirtyDaysAgo))
      .all();

    // Count points per researcher this month
    const monthlyPoints: Record<string, { name: string; points: number }> = {};
    recentAwards.forEach(award => {
      if (!monthlyPoints[award.researcherId]) {
        monthlyPoints[award.researcherId] = {
          name: award.researcherName,
          points: 0,
        };
      }
      monthlyPoints[award.researcherId].points += award.pointsAwarded;
    });

    // Find top researcher
    const topResearcher = Object.values(monthlyPoints).sort((a, b) => b.points - a.points)[0] || null;

    return NextResponse.json({
      totalPointsAwarded,
      totalResearchers,
      totalReportsAccepted,
      averagePointsPerReport,
      topResearcherThisMonth: topResearcher,
    });
  } catch (error) {
    console.error('[GET /api/hall-of-fame/stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
