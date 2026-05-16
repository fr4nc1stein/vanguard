/**
 * POST /api/reports — Submit a new vulnerability report
 *
 * - No authentication required (public submission)
 * - Validates input with Zod
 * - Encrypts sensitive fields (email, body) with AES-GCM-256
 * - Stores in Cloudflare D1
 * - Hashes submitter IP for privacy
 * - Appends audit log entry
 * - Optionally notifies via Discord webhook
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, getCfEnv } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { encryptText, hashValue } from '@/lib/crypto';
import { ReportSubmitSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { auth } from '@clerk/nextjs/server';

function generateRefId(severity: string): string {
  const year = new Date().getFullYear();
  // Use cryptographically secure random hex (8 chars = ~16M possibilities)
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  // Severity code: C (Critical), H (High), M (Medium), L (Low), I (Info)
  const severityCode = severity.charAt(0).toUpperCase();
  return `VVDP-${severityCode}-${year}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check — submission requires sign-in ────────────────────────────
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Parse + validate ────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = ReportSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const data = parsed.data;

    // ── Get D1 binding ───────────────────────────────────────────────────────
    const db = getDb(getCfEnv().DB);

    // ── Ensure unique refId ──────────────────────────────────────────────────
    let refId = generateRefId(data.severity);
    const existing = await db.select().from(reports).where(eq(reports.refId, refId)).get();
    if (existing) refId = generateRefId(data.severity); // retry once

    // ── Encrypt sensitive fields ─────────────────────────────────────────────
    const fullBody = JSON.stringify({
      description:      data.description,
      stepsToReproduce: data.stepsToReproduce,
      impact:           data.impact,
      evidence:         data.evidence ?? '',
    });

    const [bodyEnc, emailEnc] = await Promise.all([
      encryptText(fullBody),
      data.email ? encryptText(data.email) : null,
    ]);

    // ── Hash IP for privacy-preserving storage ───────────────────────────────
    const clientIp = request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'unknown';
    const ipHash = await hashValue(clientIp);

    // ── Clerk session ────────────────────────────────────────────────────────
    const clerkUserId: string = userId;

    // ── Insert report ────────────────────────────────────────────────────────
    const reportId  = crypto.randomUUID();
    const now       = Date.now();

    await db.insert(reports).values({
      id:             reportId,
      refId,
      handle:         data.handle?.trim() || null,
      emailEncrypted: emailEnc?.ciphertext ?? null,
      emailIv:        emailEnc?.iv ?? null,
      target:         data.target,
      vulnType:       data.vulnType,
      severity:       data.severity,
      title:          data.title.trim(),
      bodyEncrypted:  bodyEnc.ciphertext,
      bodyIv:         bodyEnc.iv,
      cvss:           data.cvss?.trim() || null,
      status:         'new',
      pocFiles:       '[]',
      clerkUserId,
      ipHash,
      submittedAt:    now,
      updatedAt:      now,
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await logAudit({
      db,
      reportId,
      actorId:    clerkUserId ?? 'anonymous',
      action:     'report_submitted',
      newValue:   data.severity,
      ipAddress:  clientIp,
    });

    // ── Discord notification (optional) ─────────────────────────────────────
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (webhook) {
      const sevEmoji: Record<string, string> = { Critical:'🔴', High:'🟠', Medium:'🟡', Low:'🔵', Info:'⚪' };
      const sevColor: Record<string, number> = { Critical:0xef4444, High:0xf97316, Medium:0xeab308, Low:0x3b82f6, Info:0x6b7280 };
      fetch(webhook, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title:  `${sevEmoji[data.severity] ?? '⚪'} New ${data.severity} Report [${refId}]`,
            color:  sevColor[data.severity] ?? 0x6b7280,
            fields: [
              { name: 'Reference',  value: refId,                            inline: true  },
              { name: 'Severity',   value: data.severity,                    inline: true  },
              { name: 'Target',     value: data.target,                      inline: true  },
              { name: 'Type',       value: data.vulnType,                    inline: true  },
              { name: 'Researcher', value: data.handle || 'Anonymous',       inline: true  },
              { name: 'Admin URL',  value: `/admin/reports/${reportId}`,     inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Vanguard VDP — Vulnerability Disclosure Program' },
          }],
        }),
      }).catch(e => console.error('[discord]', e));
    }

    return NextResponse.json({ success: true, referenceId: refId }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/reports]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      process.env.NODE_ENV === 'development'
        ? { error: 'Internal server error', detail: message }
        : { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ── GET /api/reports — list own reports (auth required) ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(getCfEnv().DB);

    const rows = await db.select({
      id:          reports.id,
      refId:       reports.refId,
      target:      reports.target,
      severity:    reports.severity,
      title:       reports.title,
      status:      reports.status,
      submittedAt: reports.submittedAt,
    })
      .from(reports)
      .where(eq(reports.clerkUserId, userId))
      .orderBy(reports.submittedAt);

    return NextResponse.json({ reports: rows });
  } catch (err) {
    console.error('[GET /api/reports]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
