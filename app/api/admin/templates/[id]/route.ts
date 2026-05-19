/**
 * GET /api/admin/templates/[id] — Get single template
 * PATCH /api/admin/templates/[id] — Update template
 * DELETE /api/admin/templates/[id] — Soft delete template
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { TemplateUpdateSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('TRIAGER'); // TRIAGER can view templates

    const { id } = await params;
    const d1 = getCfEnv().DB;
    const template = await d1
      .prepare('SELECT * FROM response_templates WHERE id = ?')
      .bind(id)
      .first();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/templates/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireRole('ADMIN'); // Only admins can update

    const json = await request.json();
    const validated = TemplateUpdateSchema.parse(json);

    const { id } = await params;
    const d1 = getCfEnv().DB;

    // Check if template exists
    const existing = await d1
      .prepare('SELECT * FROM response_templates WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.category !== undefined) {
      updates.push('category = ?');
      values.push(validated.category);
    }
    if (validated.subject !== undefined) {
      updates.push('subject = ?');
      values.push(validated.subject);
    }
    if (validated.body !== undefined) {
      updates.push('body = ?');
      values.push(validated.body);

      // Re-extract variables if body changed
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables: string[] = [];
      let match;
      while ((match = variableRegex.exec(validated.body)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
      updates.push('variables = ?');
      values.push(JSON.stringify(variables));
    }
    if (validated.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(validated.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await d1
      .prepare(`UPDATE response_templates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Fetch updated template
    const updated = await d1
      .prepare('SELECT * FROM response_templates WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/templates/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN'); // Only admins can delete

    const { id } = await params;
    const d1 = getCfEnv().DB;

    // Check if template exists
    const existing = await d1
      .prepare('SELECT * FROM response_templates WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Soft delete (set is_active = 0)
    const now = Date.now();
    await d1
      .prepare('UPDATE response_templates SET is_active = 0, updated_at = ? WHERE id = ?')
      .bind(now, id)
      .run();

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/templates/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
