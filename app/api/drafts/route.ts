import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reportDrafts } from '@/lib/db/schema';
import { decryptText, encryptText } from '@/lib/crypto';
import { ReportDraftDataSchema } from '@/lib/validation';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb(getCfEnv().DB);
  const draft = await db.select().from(reportDrafts).where(eq(reportDrafts.clerkUserId, userId)).get();
  if (!draft) return NextResponse.json({ draft: null });

  try {
    const plaintext = await decryptText(draft.data, draft.dataIv);
    return NextResponse.json({ draft: { data: JSON.parse(plaintext), updatedAt: draft.updatedAt } });
  } catch (err) {
    console.error('[GET /api/drafts] Failed to decrypt draft', err);
    return NextResponse.json({ draft: null });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ReportDraftDataSchema.safeParse((body as { data?: unknown }).data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const db = getDb(getCfEnv().DB);
  const now = Date.now();
  const encrypted = await encryptText(JSON.stringify(parsed.data));
  const existing = await db.select({ id: reportDrafts.id }).from(reportDrafts).where(eq(reportDrafts.clerkUserId, userId)).get();

  if (existing) {
    await db.update(reportDrafts)
      .set({ data: encrypted.ciphertext, dataIv: encrypted.iv, updatedAt: now })
      .where(eq(reportDrafts.clerkUserId, userId));
  } else {
    await db.insert(reportDrafts).values({
      id: crypto.randomUUID(),
      clerkUserId: userId,
      data: encrypted.ciphertext,
      dataIv: encrypted.iv,
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb(getCfEnv().DB);
  await db.delete(reportDrafts).where(eq(reportDrafts.clerkUserId, userId));
  return NextResponse.json({ success: true });
}
