/**
 * GET /api/scopes — Public endpoint to list active scopes for the submission form
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { scopes } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb(getCfEnv().DB);
    const activeScopes = await db
      .select({
        id:                  scopes.id,
        domain:              scopes.domain,
        description:         scopes.description,
        targetType:          scopes.targetType,
        status:              scopes.status,
        allowedVulnTypes:    scopes.allowedVulnTypes,
        severityRestriction: scopes.severityRestriction,
        notes:               scopes.notes,
        exclusionPaths:      scopes.exclusionPaths,
      })
      .from(scopes)
      .where(and(eq(scopes.status, 'active'), isNull(scopes.deletedAt)))
      .all();

    return NextResponse.json({
      scopes: activeScopes,
      total: activeScopes.length,
    });
  } catch (err) {
    console.error('[GET /api/scopes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
