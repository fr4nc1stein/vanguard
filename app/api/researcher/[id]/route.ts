/**
 * GET /api/researcher/[id] - Public researcher profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame, researcherStats } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    const isOwner = userId === id;
    const db = getDb(getCfEnv().DB);

    const statsRow = await db
      .select({ hofOptOut: researcherStats.hofOptOut })
      .from(researcherStats)
      .where(eq(researcherStats.researcherId, id))
      .get();

    if ((statsRow?.hofOptOut ?? 0) === 1 && !isOwner) {
      return NextResponse.json({ error: 'Researcher not found' }, { status: 404 });
    }

    const entryVisibility = isOwner
      ? eq(hallOfFame.researcherId, id)
      : and(eq(hallOfFame.researcherId, id), eq(hallOfFame.isPublic, 1));

    const publicEntries = await db
      .select()
      .from(hallOfFame)
      .where(entryVisibility)
      .orderBy(desc(hallOfFame.acceptedAt))
      .all();

    if (publicEntries.length === 0) {
      return NextResponse.json({ error: 'Researcher not found' }, { status: 404 });
    }

    const totalPoints = publicEntries.reduce((sum, entry) => sum + entry.pointsAwarded, 0);
    const countSeverity = (severity: string) =>
      publicEntries.filter((entry) => entry.severity === severity).length;
    const acceptedAtValues = publicEntries.map((entry) => entry.acceptedAt);

    const clerk = await clerkClient();
    let researcherName = 'Anonymous';
    let avatarUrl: string | null = null;

    try {
      const user = await clerk.users.getUser(id);
      researcherName = getDisplayName(user);
      avatarUrl = user.imageUrl;
    } catch {
      // anonymous fallback
    }

    return NextResponse.json({
      researcherId: id,
      researcherName,
      avatarUrl,
      stats: {
        totalPoints,
        acceptedReports: publicEntries.length,
        criticalCount: countSeverity('critical'),
        highCount: countSeverity('high'),
        mediumCount: countSeverity('medium'),
        lowCount: countSeverity('low'),
        infoCount: countSeverity('informational'),
        firstReportAt: Math.min(...acceptedAtValues),
        lastReportAt: Math.max(...acceptedAtValues),
      },
      entries: publicEntries.map((e) => ({
        id: e.id,
        title: e.publicTitle ?? e.title,
        severity: e.severity,
        pointsAwarded: e.pointsAwarded,
        acceptedAt: e.acceptedAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/researcher/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
