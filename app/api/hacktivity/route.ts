/**
 * GET /api/hacktivity - Public activity feed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hacktivity, hallOfFame } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(_request: NextRequest) {
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
        severity: hacktivity.severity,
        points: hacktivity.points,
        titleDisclosed: hacktivity.titleDisclosed,
        timestamp: hacktivity.timestamp,
      })
      .from(hacktivity)
      .innerJoin(hallOfFame, eq(hacktivity.reportId, hallOfFame.reportId))
      .where(eq(hallOfFame.isPublic, 1))
      .orderBy(desc(hacktivity.timestamp))
      .limit(100)
      .all();

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const activitiesWithAvatars = await Promise.all(
      activities.map(async (activity) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        const hiddenTitle = 'Report title hidden';
        const title = Boolean(activity.titleDisclosed) ? (activity.title || hiddenTitle) : hiddenTitle;
        
        try {
          const user = await clerk.users.getUser(activity.researcherId);
          researcherName = getDisplayName(user);
          avatarUrl = user.imageUrl;
        } catch (err) {
          // User not found or error fetching, use fallback
          console.warn(`[getHacktivity] Failed to fetch Clerk data for ${activity.researcherId}:`, err);
        }
        
        return {
          ...activity,
          title,
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
