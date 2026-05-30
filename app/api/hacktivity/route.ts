/**
 * GET /api/hacktivity - Public activity feed
 * 
 * SECURITY: Report titles are only shown if titleDisclosed is 1 (true).
 * When titleDisclosed is 0, the title is redacted to prevent disclosure
 * of undisclosed vulnerability reports.
 */
import { NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hacktivity, hallOfFame, researcherStats } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET() {
  try {
    const db = getDb(getCfEnv().DB);
    
    // Only show public entries
    const activities = await db
      .select({
        id: hacktivity.id,
        reportId: hacktivity.reportId,
        researcherId: hacktivity.researcherId,
        action: hacktivity.action,
        title: hacktivity.title,
        publicTitle: hallOfFame.publicTitle,
        hallOfFameTitle: hallOfFame.title,
        severity: hacktivity.severity,
        points: hallOfFame.pointsAwarded,
        titleDisclosed: hacktivity.titleDisclosed,
        timestamp: hacktivity.timestamp,
      })
      .from(hacktivity)
      .innerJoin(hallOfFame, eq(hacktivity.reportId, hallOfFame.reportId))
      .innerJoin(researcherStats, eq(hacktivity.researcherId, researcherStats.researcherId))
      .where(and(eq(hallOfFame.isPublic, 1), eq(researcherStats.hofOptOut, 0)))
      .orderBy(desc(hacktivity.timestamp))
      .limit(100)
      .all();

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const activitiesWithAvatars = await Promise.all(
      activities.map(async (activity) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        
        try {
          const user = await clerk.users.getUser(activity.researcherId);
          researcherName = getDisplayName(user);
          avatarUrl = user.imageUrl;
        } catch (err) {
          // User not found or error fetching, use fallback
          console.warn(`[getHacktivity] Failed to fetch Clerk data for ${activity.researcherId}:`, err);
        }
        
        // SECURITY: Only show title if explicitly disclosed by researcher
        // titleDisclosed: 1 = visible, 0 = redacted
        const displayTitle = activity.titleDisclosed === 1
          ? activity.publicTitle ?? activity.hallOfFameTitle
          : '[Undisclosed]';

        return {
          id: activity.id,
          reportId: activity.reportId,
          researcherId: activity.researcherId,
          action: activity.action,
          title: displayTitle,
          severity: activity.severity,
          points: activity.points,
          titleDisclosed: activity.titleDisclosed,
          timestamp: activity.timestamp,
          researcherName,
          avatarUrl,
        };
      })
    );

    return NextResponse.json({
      activities: activitiesWithAvatars,
      total: activitiesWithAvatars.length,
    });
  } catch (error) {
    console.error('[GET /api/hacktivity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
