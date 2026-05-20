/**
 * Hall of Fame Service
 * Handles point awards, researcher stats, and activity feed
 */

import { getDb, getCfEnv } from '@/lib/db';
import { 
  reports, 
  pointsConfig, 
  researcherStats, 
  hallOfFame, 
  hacktivity,
  auditLogs 
} from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AwardPointsResult {
  success: boolean;
  points?: number;
  message?: string;
  error?: string;
}

export interface ResearcherStatsUpdate {
  researcherId: string;
  researcherName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalReports: number;
  acceptedReports: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

// ─── Title Redaction ──────────────────────────────────────────────────────────

/**
 * Redact sensitive information from report titles
 */
export function redactReportTitle(title: string): string {
  let redacted = title;

  // Remove email addresses
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // Remove IP addresses (IPv4)
  redacted = redacted.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');

  // Remove API keys/tokens (common patterns)
  redacted = redacted.replace(/\b(sk_live_|pk_live_|api_key_|token_)[a-zA-Z0-9_-]+/gi, '[API_KEY]');
  redacted = redacted.replace(/\b[a-f0-9]{32,}\b/gi, '[TOKEN]');

  // Remove full URLs (keep domain only)
  redacted = redacted.replace(/https?:\/\/([a-zA-Z0-9.-]+)(\/[^\s]*)?/g, (match, domain) => domain);

  // Remove file paths
  redacted = redacted.replace(/\/[a-zA-Z0-9_\-./]+/g, (match) => {
    // Keep short paths that look like endpoints
    if (match.length < 30 && match.split('/').length <= 4) {
      return match;
    }
    return '[PATH]';
  });

  return redacted.trim();
}

// ─── Avatar Handling ──────────────────────────────────────────────────────────

/**
 * Fetch researcher avatar from Clerk
 */
export async function fetchResearcherAvatar(clerkUserId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return user.imageUrl || null;
  } catch (error) {
    console.error('[fetchResearcherAvatar] Error:', error);
    return null;
  }
}

/**
 * Get researcher display name from Clerk
 */
export async function fetchResearcherName(clerkUserId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    
    return 'Anonymous Researcher';
  } catch (error) {
    console.error('[fetchResearcherName] Error:', error);
    return 'Anonymous Researcher';
  }
}

// ─── Point Award Logic ────────────────────────────────────────────────────────

/**
 * Award points for an accepted/fixed report
 */
export async function awardPoints(
  reportId: string,
  actorId: string
): Promise<AwardPointsResult> {
  const db = getDb(getCfEnv().DB);

  try {
    // Get report details
    const report = await db.select().from(reports).where(eq(reports.id, reportId)).get();
    
    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    // Skip if duplicate
    if (report.status === 'duplicate') {
      return { success: false, message: 'No points awarded for duplicates' };
    }

    // Skip if not accepted or fixed
    if (report.status !== 'accepted' && report.status !== 'fixed') {
      return { success: false, message: 'Points only awarded for accepted/fixed reports' };
    }

    // Check if already awarded
    const existing = await db.select().from(hallOfFame).where(eq(hallOfFame.reportId, reportId)).get();
    if (existing) {
      return { success: false, message: 'Points already awarded for this report' };
    }

    // Get points configuration
    const severityLower = report.severity.toLowerCase();
    const config = await db.select().from(pointsConfig).where(eq(pointsConfig.severity, severityLower)).get();
    
    if (!config) {
      return { success: false, error: `No points configuration found for severity: ${severityLower}` };
    }

    const points = config.points;

    // Get researcher info
    if (!report.clerkUserId) {
      return { success: false, error: 'Report has no associated researcher' };
    }

    const redactedTitle = redactReportTitle(report.title);
    const now = Date.now();

    // Create hall of fame entry (name will be fetched from Clerk dynamically)
    await db.insert(hallOfFame).values({
      id: crypto.randomUUID(),
      reportId: report.id,
      researcherId: report.clerkUserId,
      title: redactedTitle,
      severity: severityLower,
      pointsAwarded: points,
      acceptedAt: now,
      isPublic: 1,
      createdAt: now,
    });

    // Update researcher stats
    await updateResearcherStats(report.clerkUserId);

    // Create hacktivity entry (name will be fetched from Clerk dynamically)
    await db.insert(hacktivity).values({
      id: crypto.randomUUID(),
      reportId: report.id,
      researcherId: report.clerkUserId,
      action: report.status === 'accepted' ? 'accepted' : 'resolved',
      title: redactedTitle,
      severity: severityLower,
      points,
      timestamp: now,
    });

    // Log audit entry
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      reportId: report.id,
      actorId,
      actorEmail: null,
      action: 'points_awarded',
      oldValue: null,
      newValue: `${points} points for ${severityLower} report`,
      ipHash: null,
      timestamp: now,
    });

    return { 
      success: true, 
      points,
      message: `Awarded ${points} points` 
    };

  } catch (error) {
    console.error('[awardPoints] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ─── Researcher Stats Update ──────────────────────────────────────────────────

/**
 * Update or create researcher stats
 */
export async function updateResearcherStats(
  researcherId: string
): Promise<void> {
  const db = getDb(getCfEnv().DB);

  try {
    // Get all hall of fame entries for this researcher
    const entries = await db
      .select()
      .from(hallOfFame)
      .where(eq(hallOfFame.researcherId, researcherId))
      .all();

    // Calculate stats
    const totalPoints = entries.reduce((sum, entry) => sum + entry.pointsAwarded, 0);
    const acceptedReports = entries.length;
    const criticalCount = entries.filter(e => e.severity === 'critical').length;
    const highCount = entries.filter(e => e.severity === 'high').length;
    const mediumCount = entries.filter(e => e.severity === 'medium').length;
    const lowCount = entries.filter(e => e.severity === 'low').length;
    const infoCount = entries.filter(e => e.severity === 'informational').length;

    // Get all reports by this researcher
    const allReports = await db
      .select()
      .from(reports)
      .where(eq(reports.clerkUserId, researcherId))
      .all();

    const totalReports = allReports.length;
    const firstReportAt = allReports.length > 0 
      ? Math.min(...allReports.map(r => r.submittedAt))
      : null;
    const lastReportAt = allReports.length > 0
      ? Math.max(...allReports.map(r => r.submittedAt))
      : null;

    // Check if stats exist
    const existing = await db
      .select()
      .from(researcherStats)
      .where(eq(researcherStats.researcherId, researcherId))
      .get();

    const now = Date.now();

    if (existing) {
      // Update existing stats (name fetched from Clerk dynamically)
      await db
        .update(researcherStats)
        .set({
          totalPoints,
          totalReports,
          acceptedReports,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          infoCount,
          firstReportAt,
          lastReportAt,
          updatedAt: now,
        })
        .where(eq(researcherStats.researcherId, researcherId));
    } else {
      // Create new stats (name fetched from Clerk dynamically)
      await db.insert(researcherStats).values({
        researcherId,
        totalPoints,
        totalReports,
        acceptedReports,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        firstReportAt,
        lastReportAt,
        updatedAt: now,
      });
    }

  } catch (error) {
    console.error('[updateResearcherStats] Error:', error);
    throw error;
  }
}

// ─── Get Points for Severity ──────────────────────────────────────────────────

/**
 * Get points for a given severity level
 */
export async function getPointsForSeverity(severity: string): Promise<number> {
  const db = getDb(getCfEnv().DB);
  
  try {
    const severityLower = severity.toLowerCase();
    const config = await db
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.severity, severityLower))
      .get();
    
    return config?.points || 0;
  } catch (error) {
    console.error('[getPointsForSeverity] Error:', error);
    return 0;
  }
}

// ─── Get Leaderboard ──────────────────────────────────────────────────────────

/**
 * Get top researchers for leaderboard
 */
export async function getLeaderboard(limit: number = 100) {
  const db = getDb(getCfEnv().DB);
  
  try {
    const leaders = await db
      .select()
      .from(researcherStats)
      .orderBy(desc(researcherStats.totalPoints))
      .limit(limit)
      .all();

    // Add names and avatars from Clerk (with error handling)
    const leaderboardWithAvatars = await Promise.all(
      leaders.map(async (leader, index) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        try {
          researcherName = await fetchResearcherName(leader.researcherId);
          avatarUrl = await fetchResearcherAvatar(leader.researcherId);
        } catch (err) {
          // Silently fail Clerk fetch, will use fallback
          console.warn(`[getLeaderboard] Failed to fetch Clerk data for ${leader.researcherId}:`, err);
        }
        return {
          rank: index + 1,
          researcherId: leader.researcherId,
          researcherName,
          avatarUrl,
          totalPoints: leader.totalPoints,
          acceptedReports: leader.acceptedReports,
          totalReports: leader.totalReports,
          criticalCount: leader.criticalCount,
          highCount: leader.highCount,
          mediumCount: leader.mediumCount,
          lowCount: leader.lowCount,
          infoCount: leader.infoCount,
          firstReportAt: leader.firstReportAt,
          lastReportAt: leader.lastReportAt,
        };
      })
    );

    return leaderboardWithAvatars;
  } catch (error) {
    console.error('[getLeaderboard] Error:', error);
    return [];
  }
}

// ─── Get Hacktivity ───────────────────────────────────────────────────────────

/**
 * Get recent activity feed
 */
export async function getHacktivity(limit: number = 100) {
  const db = getDb(getCfEnv().DB);
  
  try {
    const activities = await db
      .select()
      .from(hacktivity)
      .orderBy(desc(hacktivity.timestamp))
      .limit(limit)
      .all();

    // Add names and avatars from Clerk (with error handling)
    const activitiesWithAvatars = await Promise.all(
      activities.map(async (activity) => {
        let researcherName = 'Anonymous';
        let avatarUrl = null;
        try {
          researcherName = await fetchResearcherName(activity.researcherId);
          avatarUrl = await fetchResearcherAvatar(activity.researcherId);
        } catch (err) {
          // Silently fail Clerk fetch, will use fallback
          console.warn(`[getHacktivity] Failed to fetch Clerk data for ${activity.researcherId}:`, err);
        }
        return {
          ...activity,
          researcherName,
          avatarUrl,
        };
      })
    );

    return activitiesWithAvatars;
  } catch (error) {
    console.error('[getHacktivity] Error:', error);
    return [];
  }
}
