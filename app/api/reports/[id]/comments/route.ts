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

const CreateCommentSchema = z.object({
  message: z.string().min(1).max(5000),
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

    // Fetch comments
    const allComments = await db
      .select()
      .from(comments)
      .where(eq(comments.reportId, reportId))
      .orderBy(comments.createdAt)
      .all();

    return NextResponse.json({ comments: allComments });
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
    const db = getDb(getCfEnv().DB);

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

    // Insert comment (name will be fetched from Clerk dynamically)
    await db.insert(comments).values({
      id: commentId,
      reportId,
      authorId: userId,
      authorRole: role,
      message: data.message,
      createdAt: now,
    });

    const newComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();

    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reports/[id]/comments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
