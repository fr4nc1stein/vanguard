/**
 * GET /api/admin/scopes — List all scopes
 * POST /api/admin/scopes — Create new scope
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { scopes } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// GET - List all scopes
export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const db = getDb(getCfEnv().DB);
    const allScopes = await db.select().from(scopes).all();

    return NextResponse.json({
      scopes: allScopes,
      total: allScopes.length,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/scopes] Error:', err);
    console.error('[GET /api/admin/scopes] Error stack:', err instanceof Error ? err.stack : 'No stack');
    console.error('[GET /api/admin/scopes] Error message:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

// POST - Create new scope
const CreateScopeSchema = z.object({
  domain: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  targetType: z.enum(['web_app', 'api', 'mobile', 'infrastructure']).optional(),
  status: z.enum(['active', 'deprecated', 'out_of_scope']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRole('ADMIN');

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = CreateScopeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const data = parsed.data;
    const db = getDb(getCfEnv().DB);
    const now = Date.now();
    const id = crypto.randomUUID();

    await db.insert(scopes).values({
      id,
      domain: data.domain,
      description: data.description || null,
      target_type: data.targetType || 'web_app',
      status: data.status || 'active',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const newScope = await db.select().from(scopes).where(eq(scopes.id, id)).get();

    return NextResponse.json({
      success: true,
      scope: newScope,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/scopes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
