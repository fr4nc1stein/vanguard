/**
 * GET /api/hall-of-fame/stats - Overall statistics
 */
import { NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, researcherStats } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET() {
  try {
    const db = getDb(getCfEnv().DB);

    const publicAwards = await db
      .select({
        id: hallOfFame.id,
        researcherId: hallOfFame.researcherId,
        pointsAwarded: hallOfFame.pointsAwarded,
        acceptedAt: hallOfFame.acceptedAt,
      })
      .from(hallOfFame)
      .innerJoin(researcherStats, eq(hallOfFame.researcherId, researcherStats.researcherId))
      .where(and(eq(hallOfFame.isPublic, 1), eq(researcherStats.hofOptOut, 0)))
      .all();

    // Calculate totals
    const totalPointsAwarded = publicAwards.reduce((sum, award) => sum + award.pointsAwarded, 0);
    const totalResearchers = new Set(publicAwards.map((award) => award.researcherId)).size;
    const totalReportsAccepted = publicAwards.length;
    const averagePointsPerReport = totalReportsAccepted > 0 
      ? Math.round(totalPointsAwarded / totalReportsAccepted)
      : 0;

    // Get top researcher this month
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentAwards = publicAwards.filter((award) => award.acceptedAt >= thirtyDaysAgo);

    // Count points per researcher this month
    const monthlyPoints: Record<string, { points: number }> = {};
    recentAwards.forEach(award => {
      if (!monthlyPoints[award.researcherId]) {
        monthlyPoints[award.researcherId] = {
          points: 0,
        };
      }
      monthlyPoints[award.researcherId].points += award.pointsAwarded;
    });

    // Find top researcher and fetch name from Clerk
    const topEntry = Object.entries(monthlyPoints).sort((a, b) => b[1].points - a[1].points)[0];
    let topResearcher = null;
    
    if (topEntry) {
      const [researcherId, data] = topEntry;
      let name = 'Anonymous';
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(researcherId);
        name = getDisplayName(user);
      } catch (err) {
        console.warn(`[stats] Failed to fetch name for ${researcherId}:`, err);
      }
      topResearcher = { name, points: data.points };
    }

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
