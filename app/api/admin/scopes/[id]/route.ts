/**
 * PATCH /api/admin/scopes/[id] — Update scope
 * DELETE /api/admin/scopes/[id] — Soft-delete scope (sets deleted_at)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { scopes } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { eq, isNull, and } from 'drizzle-orm';
import { VULN_TYPES, SEVERITIES } from '@/lib/validation';

// PATCH - Update scope
const UpdateScopeSchema = z.object({
  domain:              z.string().min(1).max(200).optional(),
  description:         z.string().max(500).optional().nullable(),
  targetType:          z.enum(['web_app', 'api', 'mobile', 'infrastructure']).optional(),
  status:              z.enum(['active', 'deprecated', 'out_of_scope']).optional(),
  allowedVulnTypes:    z.array(z.enum(VULN_TYPES)).optional().nullable(),
  severityRestriction: z.array(z.enum(SEVERITIES)).optional().nullable(),
  notes:               z.string().max(2000).optional().nullable(),
  exclusionPaths:      z.string().max(2000).optional().nullable(),
  restore:             z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRole('ADMIN');
    const { id } = await context.params;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = UpdateScopeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const data = parsed.data;
    const db = getDb(getCfEnv().DB);

    const existing = await db.select().from(scopes)
      .where(data.restore ? eq(scopes.id, id) : and(eq(scopes.id, id), isNull(scopes.deletedAt)))
      .get();
    if (!existing) {
      return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    }

    const updateData: Partial<typeof scopes.$inferInsert> = { updatedAt: Date.now() };
    if (data.restore) updateData.deletedAt = null;

    if (data.domain !== undefined)      updateData.domain      = data.domain;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.targetType !== undefined)  updateData.targetType  = data.targetType;
    if (data.status !== undefined)      updateData.status      = data.status;
    if (data.notes !== undefined)       updateData.notes       = data.notes || null;
    if (data.exclusionPaths !== undefined) updateData.exclusionPaths = data.exclusionPaths || null;

    if (data.allowedVulnTypes !== undefined) {
      updateData.allowedVulnTypes = data.allowedVulnTypes?.length
        ? JSON.stringify(data.allowedVulnTypes)
        : null;
    }
    if (data.severityRestriction !== undefined) {
      updateData.severityRestriction = data.severityRestriction?.length
        ? JSON.stringify(data.severityRestriction)
        : null;
    }

    await db.update(scopes).set(updateData).where(eq(scopes.id, id));
    const updated = await db.select().from(scopes).where(eq(scopes.id, id)).get();

    await logAudit({
      db,
      entityType: 'system',
      entityId: id,
      actorId: userId,
      action: data.restore ? 'scope_updated' : 'scope_updated',
      oldValue: existing.domain,
      newValue: data.domain ?? existing.domain,
    });

    return NextResponse.json({ success: true, scope: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/scopes/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft-delete scope
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRole('ADMIN');
    const { id } = await context.params;

    const db = getDb(getCfEnv().DB);

    const existing = await db.select().from(scopes)
      .where(and(eq(scopes.id, id), isNull(scopes.deletedAt)))
      .get();
    if (!existing) {
      return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    }

    await db.update(scopes)
      .set({ deletedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(scopes.id, id));

    await logAudit({
      db,
      entityType: 'system',
      entityId: id,
      actorId: userId,
      action: 'scope_archived',
      oldValue: existing.domain,
    });

    return NextResponse.json({ success: true, message: 'Scope archived successfully' });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/scopes/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
