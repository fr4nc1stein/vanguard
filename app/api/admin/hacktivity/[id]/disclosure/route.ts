/**
 * PATCH /api/admin/hacktivity/[id]/disclosure - Toggle title disclosure
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { hacktivity } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const DisclosureSchema = z.object({
  titleDisclosed: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');

    const { id } = await context.params;
    const json = await request.json();
    const parsed = DisclosureSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const db = getDb(getCfEnv().DB);

    // Check if entry exists
    const entry = await db
      .select()
      .from(hacktivity)
      .where(eq(hacktivity.id, id))
      .get();

    if (!entry) {
      return NextResponse.json({ error: 'Hacktivity entry not found' }, { status: 404 });
    }

    // Update title disclosure
    await db
      .update(hacktivity)
      .set({ titleDisclosed: parsed.data.titleDisclosed ? 1 : 0 })
      .where(eq(hacktivity.id, id));

    return NextResponse.json({
      success: true,
      titleDisclosed: parsed.data.titleDisclosed,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/hacktivity/[id]/disclosure]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
