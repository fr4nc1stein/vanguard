/**
 * PATCH /api/admin/scopes/[id] — Update scope
 * DELETE /api/admin/scopes/[id] — Delete scope
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { scopes } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

export const runtime = 'edge';

// PATCH - Update scope
const UpdateScopeSchema = z.object({
  domain: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  targetType: z.enum(['web_app', 'api', 'mobile', 'infrastructure']).optional(),
  status: z.enum(['active', 'deprecated', 'out_of_scope']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN');
    const { id } = await context.params;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = UpdateScopeSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[PATCH /api/admin/scopes/[id]] Validation failed:', parsed.error.flatten());
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const data = parsed.data;
    console.log('[PATCH /api/admin/scopes/[id]] Parsed data:', JSON.stringify(data));
    
    const db = getDb(getCfEnv().DB);

    // Check if scope exists
    const existing = await db.select().from(scopes).where(eq(scopes.id, id)).get();
    if (!existing) {
      console.error('[PATCH /api/admin/scopes/[id]] Scope not found:', id);
      return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    }
    console.log('[PATCH /api/admin/scopes/[id]] Existing scope:', JSON.stringify(existing));

    // Build update object with proper field mapping
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.targetType !== undefined) updateData.targetType = data.targetType;
    if (data.status !== undefined) updateData.status = data.status;

    console.log('[PATCH /api/admin/scopes/[id]] Update data:', JSON.stringify(updateData));

    // Update scope
    try {
      await db.update(scopes)
        .set(updateData)
        .where(eq(scopes.id, id));
      console.log('[PATCH /api/admin/scopes/[id]] Update successful');
    } catch (dbError) {
      console.error('[PATCH /api/admin/scopes/[id]] Database error:', dbError);
      console.error('[PATCH /api/admin/scopes/[id]] Database error details:', JSON.stringify(dbError));
      throw dbError;
    }

    const updated = await db.select().from(scopes).where(eq(scopes.id, id)).get();

    return NextResponse.json({
      success: true,
      scope: updated,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/scopes/[id]] Error:', err);
    console.error('[PATCH /api/admin/scopes/[id]] Error message:', err instanceof Error ? err.message : String(err));
    console.error('[PATCH /api/admin/scopes/[id]] Error stack:', err instanceof Error ? err.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

// DELETE - Delete scope
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN');
    const { id } = await context.params;

    const db = getDb(getCfEnv().DB);

    // Check if scope exists
    const existing = await db.select().from(scopes).where(eq(scopes.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    }

    // Delete scope
    await db.delete(scopes).where(eq(scopes.id, id));

    return NextResponse.json({
      success: true,
      message: 'Scope deleted successfully',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/scopes/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
