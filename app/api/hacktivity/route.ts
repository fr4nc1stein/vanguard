/**
 * GET /api/hacktivity - Public activity feed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hacktivity } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);
    
    const activities = await db
      .select()
      .from(hacktivity)
      .orderBy(desc(hacktivity.timestamp))
      .limit(100)
      .all();

    const activitiesWithAvatars = activities.map(activity => ({
      ...activity,
      avatarUrl: null, // Will use initials fallback in frontend
    }));

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
