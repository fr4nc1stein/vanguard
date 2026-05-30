import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';

function wordOverlapScore(a: string, b: string): number {
  const tokenize = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let matches = 0;
  wordsB.forEach(w => { if (wordsA.has(w)) matches++; });
  return matches / Math.max(wordsA.size, wordsB.size);
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const title = request.nextUrl.searchParams.get('title')?.trim() ?? '';
  if (title.length < 10) return NextResponse.json({ similar: [] });

  const db = getDb(getCfEnv().DB);
  const ownReports = await db
    .select({ id: reports.id, refId: reports.refId, title: reports.title, status: reports.status, severity: reports.severity })
    .from(reports)
    .where(eq(reports.clerkUserId, userId));

  const similar = ownReports
    .filter(r => r.status !== 'rejected' && r.status !== 'duplicate')
    .map(r => ({ ...r, score: wordOverlapScore(title, r.title) }))
    .filter(r => r.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, refId, title, status, severity }) => ({ id, refId, title, status, severity }));

  return NextResponse.json({ similar });
}
