/**
 * GET /api/researcher/[id] - Public researcher profile (no auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { hallOfFame } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getDisplayName } from '@/lib/redact';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb(getCfEnv().DB);

    const publicEntries = await db
      .select()
      .from(hallOfFame)
      .where(and(eq(hallOfFame.researcherId, id), eq(hallOfFame.isPublic, 1)))
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
