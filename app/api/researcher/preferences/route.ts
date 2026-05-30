import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { researcherStats } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb(getCfEnv().DB);
  const row = await db
    .select({ hofOptOut: researcherStats.hofOptOut })
    .from(researcherStats)
    .where(eq(researcherStats.researcherId, userId))
    .get();

  return NextResponse.json({ hofOptOut: (row?.hofOptOut ?? 0) === 1 });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { hofOptOut } = body as { hofOptOut?: unknown };
  if (typeof hofOptOut !== 'boolean') {
    return NextResponse.json({ error: 'hofOptOut must be a boolean' }, { status: 400 });
  }

  const db = getDb(getCfEnv().DB);
  const now = Date.now();
  const existing = await db
    .select({ researcherId: researcherStats.researcherId })
    .from(researcherStats)
    .where(eq(researcherStats.researcherId, userId))
    .get();

  if (existing) {
    await db
      .update(researcherStats)
      .set({ hofOptOut: hofOptOut ? 1 : 0, updatedAt: now })
      .where(eq(researcherStats.researcherId, userId));
  } else {
    await db.insert(researcherStats).values({
      researcherId: userId,
      hofOptOut: hofOptOut ? 1 : 0,
      updatedAt: now,
    });
  }

  return NextResponse.json({ success: true });
}
