/**
 * GET /api/admin/hall-of-fame/settings - Get points configuration
 * PATCH /api/admin/hall-of-fame/settings - Update points configuration
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDb, getCfEnv } from '@/lib/db';
import { pointsConfig, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// GET - Get current points configuration
export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const db = getDb(getCfEnv().DB);
    const configs = await db.select().from(pointsConfig).all();

    return NextResponse.json({
      configs,
      total: configs.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/admin/hall-of-fame/settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update points configuration
const UpdatePointsSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  points: z.number().int().min(0).max(10000),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireRole('ADMIN');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = UpdatePointsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { severity, points } = parsed.data;
    const db = getDb(getCfEnv().DB);
    const now = Date.now();

    // Get current config
    const current = await db
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.severity, severity))
      .get();

    if (!current) {
      return NextResponse.json(
        { error: `No configuration found for severity: ${severity}` },
        { status: 404 }
      );
    }

    // Update points
    await db
      .update(pointsConfig)
      .set({
        points,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(pointsConfig.severity, severity));

    // Log audit entry
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      reportId: null,
      entityType: 'system',
      entityId: 'points_config',
      actorId: userId,
      actorEmail: null,
      action: 'points_config_updated',
      oldValue: `${severity}: ${current.points}`,
      newValue: `${severity}: ${points}`,
      ipHash: null,
      timestamp: now,
    });

    const updated = await db
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.severity, severity))
      .get();

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/admin/hall-of-fame/settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
