/**
 * GET /api/admin/scopes — List all non-deleted scopes
 * POST /api/admin/scopes — Create new scope
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { scopes } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';
import { eq, isNull } from 'drizzle-orm';
import { VULN_TYPES, SEVERITIES } from '@/lib/validation';

// GET - List all non-deleted scopes
export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const db = getDb(getCfEnv().DB);
    const allScopes = await db
      .select()
      .from(scopes)
      .where(isNull(scopes.deletedAt))
      .all();

    return NextResponse.json({
      scopes: allScopes,
      total: allScopes.length,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/scopes] Error:', err);
    return NextResponse.json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

// POST - Create new scope
const CreateScopeSchema = z.object({
  domain:              z.string().min(1).max(200),
  description:         z.string().max(500).optional(),
  targetType:          z.enum(['web_app', 'api', 'mobile', 'infrastructure']).optional(),
  status:              z.enum(['active', 'deprecated', 'out_of_scope']).optional(),
  allowedVulnTypes:    z.array(z.enum(VULN_TYPES)).optional(),
  severityRestriction: z.array(z.enum(SEVERITIES)).optional(),
  notes:               z.string().max(2000).optional(),
  exclusionPaths:      z.string().max(2000).optional(),
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
      domain:              data.domain,
      description:         data.description || null,
      targetType:          data.targetType || 'web_app',
      status:              data.status || 'active',
      allowedVulnTypes:    data.allowedVulnTypes?.length ? JSON.stringify(data.allowedVulnTypes) : null,
      severityRestriction: data.severityRestriction?.length ? JSON.stringify(data.severityRestriction) : null,
      notes:               data.notes || null,
      exclusionPaths:      data.exclusionPaths || null,
      createdBy:           userId,
      createdAt:           now,
      updatedAt:           now,
    });

    const newScope = await db.select().from(scopes).where(eq(scopes.id, id)).get();

    return NextResponse.json({ success: true, scope: newScope }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/scopes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
