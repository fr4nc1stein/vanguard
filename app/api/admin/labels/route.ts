/**
 * GET  /api/admin/labels — List all labels
 * POST /api/admin/labels — Create a label
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { labels } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { LabelCreateSchema } from '@/lib/validation';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    await requireRole('TRIAGER');
    const db = getDb(getCfEnv().DB);
    const rows = await db.select().from(labels).orderBy(desc(labels.createdAt));
    return NextResponse.json({ labels: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/labels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRole('TRIAGER');

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = LabelCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const db = getDb(getCfEnv().DB);
    const now = Date.now();
    const id = crypto.randomUUID();

    await db.insert(labels).values({
      id,
      name:      parsed.data.name,
      color:     parsed.data.color,
      createdBy: userId,
      createdAt: now,
    });

    return NextResponse.json({ label: { id, ...parsed.data, createdBy: userId, createdAt: now } }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/labels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
