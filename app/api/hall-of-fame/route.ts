/**
 * GET /api/hall-of-fame - Public leaderboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/services/hall-of-fame';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  try {
    const leaderboard = await getLeaderboard(100);

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('[GET /api/hall-of-fame] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
