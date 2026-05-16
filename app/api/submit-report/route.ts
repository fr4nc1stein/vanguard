import { NextRequest, NextResponse } from "next/server";

function generateReferenceId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `VDP-${year}-${num}`;
}

interface ReportPayload {
  handle?: string;
  email?: string;
  target: string;
  vulnType: string;
  severity: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  impact: string;
  cvss?: string;
  evidence?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ReportPayload = await req.json();

    // Basic server-side validation
    if (
      !body.target ||
      !body.severity ||
      !body.title?.trim() ||
      !body.description?.trim() ||
      !body.stepsToReproduce?.trim() ||
      !body.impact?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitise severity to expected values (prevents log injection)
    const validSeverities = ["Critical", "High", "Medium", "Low", "Info"];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json(
        { success: false, error: "Invalid severity value" },
        { status: 400 }
      );
    }

    const referenceId = generateReferenceId();
    const timestamp = new Date().toISOString();

    // Server-side log (no PII - use audit logs for full details)
    console.log(`[REPORT] New submission: ${referenceId} | Severity: ${body.severity} | Time: ${timestamp}`);

    // ── Optional: Discord webhook notification ───────────────────────────────
    // Set DISCORD_WEBHOOK_URL in your .env.local to enable instant notifications.
    //
    //   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
    //
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const sevEmoji: Record<string, string> = {
        Critical: "🔴",
        High: "🟠",
        Medium: "🟡",
        Low: "🔵",
        Info: "⚪",
      };
      const sevColor: Record<string, number> = {
        Critical: 0xef4444,
        High: 0xf97316,
        Medium: 0xeab308,
        Low: 0x3b82f6,
        Info: 0x6b7280,
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: `${sevEmoji[body.severity] ?? "⚪"} New Report: ${body.title}`,
              color: sevColor[body.severity] ?? 0x6b7280,
              fields: [
                { name: "Reference",   value: referenceId,              inline: true },
                { name: "Severity",    value: body.severity,            inline: true },
                { name: "Target",      value: body.target,              inline: true },
                { name: "Type",        value: body.vulnType || "N/A",   inline: true },
                { name: "Researcher",  value: body.handle || "Anonymous", inline: true },
                { name: "Email",       value: body.email || "N/A",      inline: true },
                { name: "Description", value: body.description.substring(0, 1000) },
              ],
              timestamp,
              footer: { text: "Vanguard VDP — Vulnerability Disclosure Program" },
            },
          ],
        }),
      }).catch((err) => {
        // Non-critical — don't fail the request if webhook is down
        console.error("[BugBounty] Discord webhook error:", err);
      });
    }

    // ── Optional: Resend email notification ─────────────────────────────────
    // Uncomment and run `npm install resend` to enable email notifications.
    //
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'no-reply@vanguardvdp.ph',
    //   to:   'security@vanguardvdp.ph',
    //   subject: `[${referenceId}] [${body.severity}] ${body.title}`,
    //   text: `Reference: ${referenceId}\nTarget: ${body.target}\n\n${body.description}`,
    // });

    return NextResponse.json({ success: true, referenceId });
  } catch (err) {
    console.error("[BugBounty] Unhandled error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
