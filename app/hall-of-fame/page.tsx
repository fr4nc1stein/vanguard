"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number;
  researcherId: string;
  researcherName: string;
  avatarUrl: string | null;
  totalPoints: number;
  acceptedReports: number;
  totalReports: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  firstReportAt: number | null;
  lastReportAt: number | null;
}

interface HacktivityEntry {
  id: string;
  researcherId: string;
  researcherName: string;
  avatarUrl: string | null;
  title: string;
  severity: string;
  points: number | null;
  timestamp: number;
  action: string;
}

interface Stats {
  totalPointsAwarded: number;
  totalResearchers: number;
  totalReportsAccepted: number;
  averagePointsPerReport: number;
  topResearcherThisMonth: { name: string; points: number } | null;
}

// ─── Point values per severity ────────────────────────────────────────────────
const POINTS: Record<string, number> = {
  critical: 200,
  high: 150,
  medium: 100,
  low: 50,
  informational: 10,
};

// ─── Styling helpers ──────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    border: "border-red-200" },
  high:     { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", border: "border-orange-200" },
  medium:   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", border: "border-yellow-200" },
  low:      { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-400",   border: "border-blue-200" },
  informational: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400", border: "border-gray-200" },
};

const STATUS: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  resolved: "bg-teal-100 text-teal-700",
  points_awarded: "bg-purple-100 text-purple-700",
};

function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function SevCount({ count, sev }: { count: number; sev: string }) {
  if (count === 0) return <span className="text-gray-300">—</span>;
  const sevKey = sev.toLowerCase();
  const style = SEV[sevKey] || SEV.informational;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${style.bg} ${style.text}`}>
      {count}
    </span>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const SEVERITIES = ["all", "critical", "high", "medium", "low", "informational"] as const;
type SevFilter = (typeof SEVERITIES)[number];

// ─── Page component ───────────────────────────────────────────────────────────
export default function HallOfFame() {
  const [tab, setTab] = useState<"leaderboard" | "activity">("leaderboard");
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hacktivity, setHacktivity] = useState<HacktivityEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leaderboardRes, hacktivityRes, statsRes] = await Promise.all([
          fetch('/api/hall-of-fame'),
          fetch('/api/hacktivity'),
          fetch('/api/hall-of-fame/stats'),
        ]);

        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          setLeaderboard(data.leaderboard || []);
        }

        if (hacktivityRes.ok) {
          const data = await hacktivityRes.json();
          setHacktivity(data.activities || []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error('[Hall of Fame] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredActivity = sevFilter === "all" 
    ? hacktivity 
    : hacktivity.filter((a) => a.severity === sevFilter);

  const displayStats = stats || {
    totalResearchers: leaderboard.length,
    totalReportsAccepted: hacktivity.length,
    totalPointsAwarded: leaderboard.reduce((sum, r) => sum + r.totalPoints, 0),
    averagePointsPerReport: 0,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏆</span>
            <h1 className="text-3xl font-bold">Security Researcher Hall of Fame</h1>
          </div>
          <p className="text-blue-200 mb-10 max-w-xl">
            Recognizing the security community who help make Vanguard VDP platforms safer through responsible disclosure.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🔬", value: displayStats.totalResearchers, label: "Researchers" },
              { icon: "📋", value: displayStats.totalReportsAccepted, label: "Reports Accepted" },
              { icon: "🏆", value: displayStats.totalPointsAwarded, label: "Points Awarded" },
              { icon: "�", value: displayStats.averagePointsPerReport, label: "Avg Points/Report" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-5">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-blue-200 text-sm mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Submit CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-800">Found a vulnerability in a Vanguard VDP platform?</p>
            <p className="text-sm text-blue-600 mt-0.5">Submit a responsible disclosure. Get credited here.</p>
          </div>
          <Link
            href="/submit"
            className="flex-shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            🐛 Submit Report →
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {([["leaderboard", "🏆 Leaderboard"], ["activity", "⚡ Hactivity"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Leaderboard ───────────────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Rank</th>
                      <th className="px-5 py-3 text-left">Researcher</th>
                      <th className="px-5 py-3 text-center hidden lg:table-cell">Critical</th>
                      <th className="px-5 py-3 text-center hidden lg:table-cell">High</th>
                      <th className="px-5 py-3 text-center hidden lg:table-cell">Medium</th>
                      <th className="px-5 py-3 text-center hidden lg:table-cell">Low</th>
                      <th className="px-5 py-3 text-center">Reports</th>
                      <th className="px-5 py-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                          <div className="text-3xl mb-2">⏳</div>
                          Loading leaderboard...
                        </td>
                      </tr>
                    ) : leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                          <div className="text-3xl mb-2">🏆</div>
                          No researchers yet. Be the first!
                        </td>
                      </tr>
                    ) : leaderboard.map((r) => (
                      <tr key={r.researcherId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className={r.rank <= 3 ? "text-xl" : "text-gray-500 font-mono text-xs"}>
                            {rankBadge(r.rank)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {r.avatarUrl ? (
                              <img src={r.avatarUrl} alt={r.researcherName} className="w-9 h-9 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {r.researcherName[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{r.researcherName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {r.firstReportAt ? `Since ${formatDate(r.firstReportAt)}` : 'New researcher'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.criticalCount} sev="critical" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.highCount} sev="high" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.mediumCount} sev="medium" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.lowCount} sev="low" /></td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-medium text-gray-700">{r.acceptedReports}</span>
                          <span className="text-gray-400">/{r.totalReports}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-bold text-blue-700">{r.totalPoints.toLocaleString()}</span>
                          <span className="text-gray-400 text-xs ml-1">pts</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Points legend */}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500 mr-1">Point values:</span>
              {Object.entries(POINTS).map(([sev, pts]) => (
                <span key={sev} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${SEV[sev].bg} ${SEV[sev].text} ${SEV[sev].border}`}>
                  {sev}: {pts} pts
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Hactivity feed ───────────────────────────────────────────── */}
        {tab === "activity" && (
          <div>
            {/* Severity filter pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSevFilter(sev)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                    sevFilter === sev
                      ? "bg-blue-600 text-white"
                      : sev === "all"
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : `${SEV[sev].bg} ${SEV[sev].text} hover:opacity-80 border ${SEV[sev].border}`
                  }`}
                >
                  {sev}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-400 self-center">
                {filteredActivity.length} report{filteredActivity.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">⏳</div>
                <p>Loading activity...</p>
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🔎</div>
                <p>No reports matching this filter yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivity.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${SEV[item.severity]?.dot || SEV.informational.dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.researcherName} className="w-4 h-4 rounded-full" />
                            ) : (
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                {item.researcherName[0].toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-blue-600">{item.researcherName}</span>
                          </div>
                          <span>·</span>
                          <span>{formatDate(item.timestamp)}</span>
                          {item.points && (
                            <>
                              <span>·</span>
                              <span className="font-semibold text-green-600">+{item.points} pts</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${SEV[item.severity]?.bg || SEV.informational.bg} ${SEV[item.severity]?.text || SEV.informational.text}`}>
                        {item.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS[item.action] || STATUS.accepted}`}>
                        {item.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom CTA ───────────────────────────────────────────────── */}
        <div className="mt-14 bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-8 text-center text-white">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="text-xl font-bold mb-2">Want to be on this list?</h3>
          <p className="text-blue-200 mb-6 max-w-md mx-auto">
            Find and responsibly disclose vulnerabilities in Vanguard VDP platforms. No account needed.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-7 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm"
          >
            🐛 Submit a Vulnerability Report
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
