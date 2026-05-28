/**
 * GET /api/admin/hall-of-fame/entries - Get all hall of fame entries for admin management
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const db = getDb(getCfEnv().DB);
    
    const entries = await db
      .select()
      .from(hallOfFame)
      .orderBy(desc(hallOfFame.acceptedAt))
      .all();

    // Fetch Clerk data for all researchers
    const clerk = await clerkClient();
    const entriesWithAvatars = await Promise.all(
      entries.map(async (entry) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        
        try {
          const user = await clerk.users.getUser(entry.researcherId);
          researcherName = getDisplayName(user);
          avatarUrl = user.imageUrl;
        } catch (err) {
          console.warn(`[admin entries] Failed to fetch Clerk data for ${entry.researcherId}:`, err);
        }
        
        return {
          id: entry.id,
          reportId: entry.reportId,
          researcherId: entry.researcherId,
          researcherName,
          avatarUrl,
          title: entry.title,
          publicTitle: entry.publicTitle ?? null,
          severity: entry.severity,
          pointsAwarded: entry.pointsAwarded,
          acceptedAt: entry.acceptedAt,
          isPublic: entry.isPublic === 1,
          createdAt: entry.createdAt,
        };
      })
    );

    return NextResponse.json({
      entries: entriesWithAvatars,
      total: entriesWithAvatars.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/admin/hall-of-fame/entries] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
