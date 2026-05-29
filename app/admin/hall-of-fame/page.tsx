"use client";
import React, { useState, useEffect, useCallback } from "react";
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
  id?: string;
  isPublic?: boolean;
}

interface HallOfFameEntry {
  id: string;
  reportId: string;
  researcherId: string;
  researcherName: string;
  avatarUrl: string | null;
  title: string;
  publicTitle: string | null;
  severity: string;
  pointsAwarded: number;
  acceptedAt: number;
  isPublic: boolean;
  createdAt: number;
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

interface PointsModal {
  id: string;
  researcherName: string;
  currentPoints: number;
  newPoints: string;
  reason: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHallOfFame() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [pointsConfigs, setPointsConfigs] = useState<PointsConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesSearchQuery, setEntriesSearchQuery] = useState("");
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{ severity: string; points: number } | null>(null);

  // New state for VAN-17 features
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [editingTitle, setEditingTitle] = useState<{ id: string; value: string } | null>(null);
  const [pointsModal, setPointsModal] = useState<PointsModal | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Clear selection when page or search changes
  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [entriesPage, entriesSearchQuery]);

  async function fetchData() {
    try {
      const [leaderboardRes, entriesRes, configRes, statsRes] = await Promise.all([
        fetch('/api/admin/hall-of-fame/leaderboard'),
        fetch('/api/admin/hall-of-fame/entries'),
        fetch('/api/admin/hall-of-fame/settings'),
        fetch('/api/hall-of-fame/stats'),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard || []);
      }

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
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
      showToast('Failed to load data', 'error');
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
      showToast('Points configuration updated successfully!', 'success');
    } catch (error) {
      console.error('[handleUpdatePoints] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update points', 'error');
    }
  }

  async function handleToggleVisibility(entryId: string, currentVisibility: boolean) {
    try {
      const res = await fetch(`/api/admin/hall-of-fame/${entryId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentVisibility }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to toggle visibility');
      }

      await fetchData();
      showToast(currentVisibility ? 'Entry hidden from public' : 'Entry made public', 'success');
    } catch (error) {
      console.error('[handleToggleVisibility] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to toggle visibility', 'error');
    }
  }

  // ── Title editing ─────────────────────────────────────────────────────────

  async function handleSaveTitle(entryId: string) {
    if (!editingTitle) return;
    const value = editingTitle.value.trim();

    try {
      const res = await fetch(`/api/admin/hall-of-fame/${entryId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicTitle: value || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update title');
      }

      await fetchData();
      setEditingTitle(null);
      showToast('Title updated', 'success');
    } catch (error) {
      console.error('[handleSaveTitle] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update title', 'error');
    }
  }

  // ── Points adjustment ────────────────────────────────────────────────────

  async function handleAdjustPoints() {
    if (!pointsModal) return;
    const newPoints = parseInt(pointsModal.newPoints, 10);

    if (isNaN(newPoints) || newPoints < 0 || newPoints > 10000) {
      showToast('Points must be between 0 and 10,000', 'error');
      return;
    }
    if (!pointsModal.reason.trim()) {
      showToast('A reason is required', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/hall-of-fame/${pointsModal.id}/points`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints, reason: pointsModal.reason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to adjust points');
      }

      await fetchData();
      setPointsModal(null);
      showToast('Points adjusted successfully', 'success');
    } catch (error) {
      console.error('[handleAdjustPoints] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to adjust points', 'error');
    }
  }

  // ── Bulk visibility ──────────────────────────────────────────────────────

  async function handleBulkVisibility(isPublic: boolean) {
    if (selectedEntryIds.size === 0) return;

    try {
      const res = await fetch('/api/admin/hall-of-fame/bulk-visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedEntryIds), isPublic }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update visibility');
      }

      const data = await res.json();
      await fetchData();
      setSelectedEntryIds(new Set());
      showToast(`${data.updated} ${data.updated === 1 ? 'entry' : 'entries'} ${isPublic ? 'made public' : 'hidden'}`, 'success');
    } catch (error) {
      console.error('[handleBulkVisibility] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update visibility', 'error');
    }
  }

  // ── Leaderboard CSV export ───────────────────────────────────────────────

  async function handleExportLeaderboardCSV() {
    let exportLeaderboard = leaderboard;

    try {
      const res = await fetch('/api/admin/hall-of-fame/leaderboard?limit=all');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export leaderboard');
      }
      const data = await res.json();
      exportLeaderboard = data.leaderboard || [];
    } catch (error) {
      console.error('[handleExportLeaderboardCSV] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to export leaderboard', 'error');
      return;
    }

    const headers = ['Rank', 'Researcher', 'Points', 'Critical', 'High', 'Medium', 'Low', 'Accepted Reports', 'First Report', 'Last Report'];
    const rows = exportLeaderboard.map((e) => [
      e.rank,
      e.researcherName,
      e.totalPoints,
      e.criticalCount,
      e.highCount,
      e.mediumCount,
      e.lowCount,
      e.acceptedReports,
      e.firstReportAt ? new Date(e.firstReportAt).toISOString().split('T')[0] : '',
      e.lastReportAt  ? new Date(e.lastReportAt).toISOString().split('T')[0]  : '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Leaderboard CSV exported', 'success');
  }

  // ── Selection helpers ────────────────────────────────────────────────────

  function handleToggleSelect(id: string) {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAllOnPage() {
    const pageIds = paginatedEntries.map((e) => e.id);
    const allSelected = pageIds.every((id) => selectedEntryIds.has(id));
    if (allSelected) {
      setSelectedEntryIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedEntryIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.researcherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEntries = entries.filter((entry) =>
    entry.researcherName.toLowerCase().includes(entriesSearchQuery.toLowerCase()) ||
    (entry.publicTitle ?? entry.title).toLowerCase().includes(entriesSearchQuery.toLowerCase())
  );

  const totalEntriesPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (entriesPage - 1) * entriesPerPage,
    entriesPage * entriesPerPage
  );

  const allPageSelected = paginatedEntries.length > 0 && paginatedEntries.every((e) => selectedEntryIds.has(e.id));
  const somePageSelected = paginatedEntries.some((e) => selectedEntryIds.has(e.id));

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

      {/* Points adjustment modal */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Adjust Points</h3>
            <p className="text-sm text-gray-500 mb-4">
              Adjusting points for <span className="font-medium text-gray-700">{pointsModal.researcherName}</span>.
              Current: <span className="font-bold">{pointsModal.currentPoints} pts</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Points</label>
              <input
                type="number"
                min="0"
                max="10000"
                value={pointsModal.newPoints}
                onChange={(e) => setPointsModal({ ...pointsModal, newPoints: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Correction after duplicate detected; Reward for exceptional impact"
                value={pointsModal.reason}
                onChange={(e) => setPointsModal({ ...pointsModal, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPointsModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save Adjustment
              </button>
            </div>
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

        {/* Hall of Fame Entries Management */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">👁️ Manage Entries</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Toggle visibility, override public titles, and adjust points for individual entries.
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Bulk action toolbar */}
            {selectedEntryIds.size > 0 && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-800">
                  {selectedEntryIds.size} selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => handleBulkVisibility(true)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
                  >
                    Make Public
                  </button>
                  <button
                    onClick={() => handleBulkVisibility(false)}
                    className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => setSelectedEntryIds(new Set())}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by researcher or report title..."
                value={entriesSearchQuery}
                onChange={(e) => {
                  setEntriesSearchQuery(e.target.value);
                  setEntriesPage(1);
                }}
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected && !allPageSelected;
                      }}
                      onChange={handleSelectAllOnPage}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left">Researcher</th>
                  <th className="px-6 py-3 text-left">Title</th>
                  <th className="px-6 py-3 text-center">Severity</th>
                  <th className="px-6 py-3 text-center">Points</th>
                  <th className="px-6 py-3 text-center">Date</th>
                  <th className="px-6 py-3 text-center">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">⏳</div>
                      Loading entries...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">🏆</div>
                      No hall of fame entries yet
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${selectedEntryIds.has(entry.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedEntryIds.has(entry.id)}
                          onChange={() => handleToggleSelect(entry.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.researcherName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                              {entry.researcherName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{entry.researcherName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {editingTitle?.id === entry.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle.value}
                              onChange={(e) => setEditingTitle({ ...editingTitle, value: e.target.value })}
                              className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Leave blank to use auto-generated title"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(entry.id);
                                if (e.key === 'Escape') setEditingTitle(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveTitle(entry.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTitle(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 group">
                            <div className="flex-1 min-w-0">
                              <a
                                href={`/triage/reports/${entry.reportId}`}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                title={entry.publicTitle ?? entry.title}
                              >
                                {entry.publicTitle ?? entry.title}
                              </a>
                              {entry.publicTitle && (
                                <p className="text-xs text-gray-400 truncate mt-0.5" title={entry.title}>
                                  orig: {entry.title}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setEditingTitle({ id: entry.id, value: entry.publicTitle ?? '' })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-gray-400 hover:text-blue-600"
                              title="Override public title"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          entry.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          entry.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          entry.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          entry.severity === 'low' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 group">
                          <span className="font-semibold text-gray-900">{entry.pointsAwarded}</span>
                          <button
                            onClick={() => setPointsModal({
                              id: entry.id,
                              researcherName: entry.researcherName,
                              currentPoints: entry.pointsAwarded,
                              newPoints: String(entry.pointsAwarded),
                              reason: '',
                            })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
                            title="Adjust points"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {new Date(entry.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleVisibility(entry.id, entry.isPublic)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            entry.isPublic
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {entry.isPublic ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Public
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              Hidden
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalEntriesPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((entriesPage - 1) * entriesPerPage) + 1} to {Math.min(entriesPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEntriesPage(p => Math.max(1, p - 1))}
                  disabled={entriesPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalEntriesPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setEntriesPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        page === entriesPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setEntriesPage(p => Math.min(totalEntriesPages, p + 1))}
                  disabled={entriesPage === totalEntriesPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📊 Leaderboard</h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">
                  {filteredLeaderboard.length} researcher{filteredLeaderboard.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={handleExportLeaderboardCSV}
                  disabled={leaderboard.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
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
                            <a
                              href={`/researcher/${entry.researcherId}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {entry.researcherName}
                            </a>
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
