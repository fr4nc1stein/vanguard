/**
 * GET /api/admin/templates — List all response templates
 * POST /api/admin/templates — Create new template
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, like, and, desc } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { TemplateCreateSchema } from '@/lib/validation';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    // TRIAGER can view templates (for using them), ADMIN can manage
    await requireRole('TRIAGER');

    const sp = request.nextUrl.searchParams;
    const category = sp.get('category');
    const search = sp.get('q');
    const activeOnly = sp.get('active_only') === 'true';

    const d1 = getCfEnv().DB;

    // Build where conditions
    const conditions = [];
    if (category && category !== 'all') {
      conditions.push(`category = '${category}'`);
    }
    if (activeOnly) {
      conditions.push('is_active = 1');
    }
    if (search) {
      const sanitized = search.replace(/'/g, "''");
      conditions.push(`(name LIKE '%${sanitized}%' OR body LIKE '%${sanitized}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch templates
    const query = `
      SELECT 
        id,
        name,
        category,
        subject,
        body,
        variables,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM response_templates
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await d1.prepare(query).all();

    return NextResponse.json({
      templates: result.results || [],
      total: result.results?.length || 0,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/templates]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRole('ADMIN'); // Only admins can create templates

    const json = await request.json();
    const validated = TemplateCreateSchema.parse(json);

    const d1 = getCfEnv().DB;
    const now = Date.now();
    const id = `tpl_${nanoid(12)}`;

    // Extract variables from template body
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(validated.body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    await d1
      .prepare(
        `INSERT INTO response_templates 
        (id, name, category, subject, body, variables, is_active, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(
        id,
        validated.name,
        validated.category,
        validated.subject || null,
        validated.body,
        JSON.stringify(variables),
        userId,
        now,
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      template: {
        id,
        name: validated.name,
        category: validated.category,
        subject: validated.subject,
        body: validated.body,
        variables,
        is_active: true,
        created_by: userId,
        created_at: now,
        updated_at: now,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/templates]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
