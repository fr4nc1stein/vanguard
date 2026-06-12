/**
 * GET  /api/admin/saved-filters — List saved filters for the current user
 * POST /api/admin/saved-filters — Create a saved filter
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { savedFilters } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { SavedFilterCreateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const { userId } = await requireRole('TRIAGER');
    const db = getDb(getCfEnv().DB);

    const rows = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.userId, userId))
      .orderBy(desc(savedFilters.createdAt));

    return NextResponse.json({ filters: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/saved-filters]', err);
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
    const parsed = SavedFilterCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const db = getDb(getCfEnv().DB);
    const now = Date.now();
    const id = crypto.randomUUID();

    await db.insert(savedFilters).values({
      id,
      userId,
      name:       parsed.data.name,
      filterJson: JSON.stringify(parsed.data.filter_json),
      createdAt:  now,
      updatedAt:  now,
    });

    return NextResponse.json(
      { filter: { id, userId, name: parsed.data.name, filterJson: JSON.stringify(parsed.data.filter_json), createdAt: now, updatedAt: now } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/saved-filters]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
