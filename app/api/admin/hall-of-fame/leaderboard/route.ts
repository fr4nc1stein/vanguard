/**
 * GET /api/admin/hall-of-fame/leaderboard - Admin leaderboard view
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getLeaderboard } from '@/lib/services/hall-of-fame';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const leaderboard = await getLeaderboard(100);

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/admin/hall-of-fame/leaderboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
