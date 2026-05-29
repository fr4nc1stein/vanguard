/**
 * GET /api/reports/[id]/comments — Get all comments for a report
 * POST /api/reports/[id]/comments — Add a comment to a report
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCfEnv } from '@/lib/db';
import { comments, reports } from '@/lib/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDisplayName } from '@/lib/redact';
import { logAudit } from '@/lib/audit';

const CreateCommentSchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
  templateId: z.string().min(1).max(100).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reportId } = await params;
    const db = getDb(getCfEnv().DB);

    // Verify user has access to this report
    const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user owns this report or is TRIAGER/ADMIN
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    const isStaff = role === 'TRIAGER' || role === 'ADMIN';

    if (report.clerkUserId !== userId && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch comments - filter internal comments for non-staff users
    const allComments = await db
      .select()
      .from(comments)
      .where(eq(comments.reportId, reportId))
      .orderBy(comments.createdAt)
      .all();

    // Filter out internal comments if user is not staff
    const visibleComments = isStaff 
      ? allComments 
      : allComments.filter(c => c.isInternal === 0);

    return NextResponse.json({ comments: visibleComments });
  } catch (err) {
    console.error('[GET /api/reports/[id]/comments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reportId } = await params;
    const env = getCfEnv();
    const db = getDb(env.DB);

    // Verify user has access to this report
    const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user owns this report or is TRIAGER/ADMIN
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role || 'USER';
    const isStaff = role === 'TRIAGER' || role === 'ADMIN';

    if (report.clerkUserId !== userId && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const now = Date.now();
    const commentId = crypto.randomUUID();

    // Only staff can create internal comments
    const isInternal = data.isInternal && isStaff ? 1 : 0;

    // Insert comment (name will be fetched from Clerk dynamically)
    await db.insert(comments).values({
      id: commentId,
      reportId,
      authorId: userId,
      authorRole: role,
      message: data.message,
      isInternal,
      createdAt: now,
    });

    const newComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    if (data.templateId && isStaff) {
      const template = await env.DB
        .prepare('SELECT name FROM response_templates WHERE id = ? AND is_active = 1')
        .bind(data.templateId)
        .first<{ name?: string }>();

      if (template) {
        await logAudit({
          db,
          reportId,
          actorId: userId,
          action: 'template_used',
          oldValue: data.templateId,
          newValue: template.name || data.templateId,
        });
      }
    }

    await logAudit({
      db,
      reportId,
      actorId: userId,
      action: 'comment_posted',
      newValue: isInternal ? 'internal' : 'public',
    });

    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reports/[id]/comments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
