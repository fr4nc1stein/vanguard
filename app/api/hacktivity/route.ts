/**
 * GET /api/hacktivity - Public activity feed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getHacktivity } from '@/lib/services/hall-of-fame';

export const runtime = 'edge';

export async function GET(_request: NextRequest) {
  try {
    const activities = await getHacktivity(100);

    return NextResponse.json({
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error('[GET /api/hacktivity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
