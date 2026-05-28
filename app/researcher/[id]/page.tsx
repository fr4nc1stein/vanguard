"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearcherProfile {
  researcherId: string;
  researcherName: string;
  avatarUrl: string | null;
  stats: {
    totalPoints: number;
    acceptedReports: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    firstReportAt: number | null;
    lastReportAt: number | null;
  };
  entries: {
    id: string;
    title: string;
    severity: string;
    pointsAwarded: number;
    acceptedAt: number;
  }[];
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

const SEV: Record<string, { bg: string; text: string }> = {
  critical:      { bg: "bg-red-100",    text: "text-red-800" },
  high:          { bg: "bg-orange-100", text: "text-orange-800" },
  medium:        { bg: "bg-yellow-100", text: "text-yellow-800" },
  low:           { bg: "bg-blue-100",   text: "text-blue-800" },
  informational: { bg: "bg-gray-100",   text: "text-gray-700" },
};

function sevStyle(sev: string) {
  return SEV[sev.toLowerCase()] ?? SEV.informational;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResearcherProfile() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/researcher/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setProfile(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400 text-lg">
            Loading...
          </div>
        ) : notFound || !profile ? (
          <div className="text-center py-32">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Researcher not found</h2>
            <p className="text-gray-500 mb-6">This profile doesn&apos;t exist or has no public entries.</p>
            <Link href="/hall-of-fame" className="text-blue-600 hover:underline text-sm font-medium">
              ← Back to Hall of Fame
            </Link>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 flex items-center gap-6">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.researcherName}
                  className="w-20 h-20 rounded-full ring-4 ring-blue-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-blue-100">
                  {profile.researcherName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.researcherName}</h1>
                <p className="text-sm text-gray-500 mt-1">Security Researcher</p>
                {profile.stats.firstReportAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Member since {new Date(profile.stats.firstReportAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-blue-700">{profile.stats.totalPoints.toLocaleString()}</p>
                <p className="text-sm text-gray-500">total points</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Critical', count: profile.stats.criticalCount, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                { label: 'High',     count: profile.stats.highCount,     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                { label: 'Medium',   count: profile.stats.mediumCount,   bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                { label: 'Low',      count: profile.stats.lowCount,      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
                { label: 'Info',     count: profile.stats.infoCount,     bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
              ].map(({ label, count, bg, text, border }) => (
                <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${text}`}>{count}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Entries table */}
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Accepted Reports
                  <span className="ml-2 text-sm font-normal text-gray-400">({profile.entries.length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Title</th>
                      <th className="px-6 py-3 text-center">Severity</th>
                      <th className="px-6 py-3 text-center">Points</th>
                      <th className="px-6 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profile.entries.map((entry) => {
                      const sev = sevStyle(entry.severity);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-medium">{entry.title}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${sev.bg} ${sev.text}`}>
                              {entry.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-700">
                            +{entry.pointsAwarded}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500">
                            {new Date(entry.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/hall-of-fame" className="text-sm text-blue-600 hover:underline font-medium">
                ← Back to Hall of Fame
              </Link>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
