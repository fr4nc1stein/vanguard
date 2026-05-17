"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

interface PointsConfig {
  id: string;
  severity: string;
  points: number;
  updatedAt: number;
  updatedBy: string;
}

interface Stats {
  totalPointsAwarded: number;
  totalResearchers: number;
  totalReportsAccepted: number;
  averagePointsPerReport: number;
  topResearcherThisMonth: { name: string; points: number } | null;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHallOfFame() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsConfigs, setPointsConfigs] = useState<PointsConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{ severity: string; points: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchData() {
    try {
      const [leaderboardRes, configRes, statsRes] = await Promise.all([
        fetch('/api/admin/hall-of-fame/leaderboard'),
        fetch('/api/admin/hall-of-fame/settings'),
        fetch('/api/hall-of-fame/stats'),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard || []);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setPointsConfigs(data.configs || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('[Admin Hall of Fame] Error fetching data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePoints() {
    if (!editingConfig) return;

    try {
      const res = await fetch('/api/admin/hall-of-fame/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update points');
      }

      await fetchData();
      setEditingConfig(null);
      setToast({ message: 'Points configuration updated successfully!', type: 'success' });
    } catch (error) {
      console.error('[handleUpdatePoints] Error:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to update points',
        type: 'error',
      });
    }
  }

  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.researcherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayStats = stats || {
    totalPointsAwarded: leaderboard.reduce((sum, r) => sum + r.totalPoints, 0),
    totalResearchers: leaderboard.length,
    totalReportsAccepted: leaderboard.reduce((sum, r) => sum + r.acceptedReports, 0),
    averagePointsPerReport: 0,
    topResearcherThisMonth: null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`px-5 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-white font-medium`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏆 Hall of Fame Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage leaderboard, points configuration, and researcher recognition
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Points Awarded</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {displayStats.totalPointsAwarded.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Researchers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {displayStats.totalResearchers}
                </p>
              </div>
              <div className="text-3xl">🔬</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reports Accepted</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {displayStats.totalReportsAccepted}
                </p>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Points/Report</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {displayStats.averagePointsPerReport}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </div>

        {/* Points Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">⚙️ Points Configuration</h2>
              <button
                onClick={() => setShowConfigEdit(!showConfigEdit)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showConfigEdit ? 'Hide' : 'Edit Points'}
              </button>
            </div>
          </div>

          {showConfigEdit && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Configure points awarded per severity level. Changes affect future reports only.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {pointsConfigs.map((config) => (
                  <div key={config.severity} className="bg-white rounded-lg border border-gray-200 p-4">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                      {config.severity}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={editingConfig?.severity === config.severity ? editingConfig.points : config.points}
                      onChange={(e) =>
                        setEditingConfig({
                          severity: config.severity,
                          points: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              {editingConfig && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleUpdatePoints}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-3">
              {pointsConfigs.map((config) => (
                <div
                  key={config.severity}
                  className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-200"
                >
                  <span className="text-xs font-semibold text-gray-700 uppercase">{config.severity}</span>
                  <span className="ml-2 text-sm font-bold text-gray-900">{config.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📊 Leaderboard</h2>
              <div className="text-sm text-gray-500">
                {filteredLeaderboard.length} researcher{filteredLeaderboard.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search researchers by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Researcher</th>
                  <th className="px-6 py-3 text-center">Critical</th>
                  <th className="px-6 py-3 text-center">High</th>
                  <th className="px-6 py-3 text-center">Medium</th>
                  <th className="px-6 py-3 text-center">Low</th>
                  <th className="px-6 py-3 text-center">Reports</th>
                  <th className="px-6 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">⏳</div>
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">🔍</div>
                      {searchQuery ? 'No researchers found' : 'No researchers yet'}
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((entry) => (
                    <tr key={entry.researcherId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={entry.rank <= 3 ? "text-xl" : "text-gray-500 font-mono text-xs"}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt={entry.researcherName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {entry.researcherName[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{entry.researcherName}</p>
                            <p className="text-xs text-gray-400">{entry.researcherId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-100 text-red-800 text-xs font-bold">
                          {entry.criticalCount || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-orange-100 text-orange-800 text-xs font-bold">
                          {entry.highCount || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-yellow-100 text-yellow-800 text-xs font-bold">
                          {entry.mediumCount || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                          {entry.lowCount || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium text-gray-700">{entry.acceptedReports}</span>
                        <span className="text-gray-400">/{entry.totalReports}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-blue-700">{entry.totalPoints.toLocaleString()}</span>
                        <span className="text-gray-400 text-xs ml-1">pts</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
