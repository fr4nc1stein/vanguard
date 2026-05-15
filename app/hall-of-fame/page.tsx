"use client";
import React, { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Researcher {
  handle: string;
  country: string;
  reports: number;
  accepted: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  points: number;
  since: string;
}

interface ActivityEntry {
  handle: string;
  date: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  target: string;
  status: "Accepted" | "Fixed" | "Triaged";
}

// ─── Point values per severity ────────────────────────────────────────────────
const POINTS: Record<string, number> = {
  Critical: 200,
  High: 100,
  Medium: 50,
  Low: 20,
  Info: 5,
};

// ─── Static data (update as new researchers are credited) ─────────────────────
const RESEARCHERS: Researcher[] = [
  {
    handle: "laet4x",
    country: "🇵🇭",
    reports: 1,
    accepted: 1,
    critical: 0,
    high: 1,
    medium: 0,
    low: 0,
    info: 0,
    points: 100,
    since: "Oct 2025",
  },
];

const ACTIVITY: ActivityEntry[] = [
  {
    handle: "laet4x",
    date: "Oct 2025",
    title: "Broken Access Control — Authenticated user can edit any petition",
    severity: "High",
    target: "laet4x.com",
    status: "Accepted",
  },
];

// ─── Styling helpers ──────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Critical: { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    border: "border-red-200" },
  High:     { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", border: "border-orange-200" },
  Medium:   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", border: "border-yellow-200" },
  Low:      { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-400",   border: "border-blue-200" },
  Info:     { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400",   border: "border-gray-200" },
};

const STATUS: Record<string, string> = {
  Accepted: "bg-green-100 text-green-700",
  Fixed:    "bg-teal-100 text-teal-700",
  Triaged:  "bg-purple-100 text-purple-700",
};

function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function SevCount({ count, sev }: { count: number; sev: string }) {
  if (count === 0) return <span className="text-gray-300">—</span>;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${SEV[sev].bg} ${SEV[sev].text}`}>
      {count}
    </span>
  );
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────
const STATS = {
  researchers: RESEARCHERS.length,
  reports: ACTIVITY.length,
  fixed: ACTIVITY.filter((a) => a.status === "Fixed").length,
  critical: RESEARCHERS.reduce((s, r) => s + r.critical, 0),
};

const SEVERITIES = ["All", "Critical", "High", "Medium", "Low", "Info"] as const;
type SevFilter = (typeof SEVERITIES)[number];

// ─── Page component ───────────────────────────────────────────────────────────
export default function HallOfFame() {
  const [tab, setTab] = useState<"leaderboard" | "activity">("leaderboard");
  const [sevFilter, setSevFilter] = useState<SevFilter>("All");

  const filteredActivity =
    sevFilter === "All" ? ACTIVITY : ACTIVITY.filter((a) => a.severity === sevFilter);

  const sorted = [...RESEARCHERS].sort((a, b) => b.points - a.points);

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
              { icon: "🔬", value: STATS.researchers, label: "Researchers" },
              { icon: "📋", value: STATS.reports,     label: "Reports Submitted" },
              { icon: "✅", value: STATS.fixed,       label: "Vulnerabilities Fixed" },
              { icon: "🚨", value: STATS.critical,    label: "Critical Findings" },
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
                    {sorted.map((r, i) => (
                      <tr key={r.handle} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className={i < 3 ? "text-xl" : "text-gray-500 font-mono text-xs"}>
                            {rankBadge(i + 1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {r.handle[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{r.handle}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{r.country} · Since {r.since}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.critical} sev="Critical" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.high} sev="High" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.medium} sev="Medium" /></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><SevCount count={r.low} sev="Low" /></td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-medium text-gray-700">{r.accepted}</span>
                          <span className="text-gray-400">/{r.reports}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-bold text-blue-700">{r.points.toLocaleString()}</span>
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    sevFilter === sev
                      ? "bg-blue-600 text-white"
                      : sev === "All"
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

            {filteredActivity.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🔎</div>
                <p>No reports matching this filter yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivity.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${SEV[item.severity].dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                          <span className="font-medium text-blue-600">{item.handle}</span>
                          <span>·</span>
                          <a href={`https://${item.target}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                            {item.target}
                          </a>
                          <span>·</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SEV[item.severity].bg} ${SEV[item.severity].text}`}>
                        {item.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS[item.status]}`}>
                        {item.status}
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
