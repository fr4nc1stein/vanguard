"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ReportStatusBadge from "../components/ReportStatusBadge";
import Pagination from "../components/Pagination";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface LabelInfo {
  id: string;
  name: string;
  color: string;
}

interface ReportRow {
  id: string;
  refId: string;
  target: string;
  vulnType: string;
  severity: string;
  title: string;
  status: string;
  assignedTo: string | null;
  submittedAt: number;
  updatedAt: number;
  labels: LabelInfo[];
}

interface AdminReportsResponse {
  reports: ReportRow[];
  pagination: { total: number; page: number; per_page: number; pages: number };
}

interface SavedFilter {
  id: string;
  name: string;
  filterJson: string;
}

const STATUSES = ["all", "new", "triaged", "accepted", "fixed", "rejected", "informational"] as const;
const SEVERITIES = ["all", "critical", "high", "medium", "low", "informational"] as const;
const BULK_STATUSES = ["triaged", "accepted", "rejected", "fixed", "informational"] as const;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-700 bg-red-50 border-red-200",
  high:     "text-orange-700 bg-orange-50 border-orange-200",
  medium:   "text-yellow-700 bg-yellow-50 border-yellow-200",
  low:      "text-blue-700 bg-blue-50 border-blue-200",
  informational: "text-gray-600 bg-gray-50 border-gray-200",
};

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function LabelChip({ label, onRemove }: { label: LabelInfo; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-75 leading-none" title="Remove label">
          ×
        </button>
      )}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, per_page: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ReportRow>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [researcherFilter, setResearcherFilter] = useState<string | null>(null);
  const [hasReadUrlFilters, setHasReadUrlFilters] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);

  // Labels
  const [allLabels, setAllLabels] = useState<LabelInfo[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [labelMenuReportId, setLabelMenuReportId] = useState<string | null>(null);
  const labelMenuRef = useRef<HTMLDivElement>(null);

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [showSavedFiltersMenu, setShowSavedFiltersMenu] = useState(false);
  const savedFiltersMenuRef = useRef<HTMLDivElement>(null);

  const fetchReports = useCallback(async () => {
    if (!hasReadUrlFilters) return;

    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (filterStatus !== "all")   params.set("status", filterStatus);
    if (filterSeverity !== "all") params.set("severity", filterSeverity);
    if (search)                   params.set("q", search);
    if (filterLabelId)            params.set("label_id", filterLabelId);
    if (assignmentFilter === "mine" && currentUserEmail) params.set("assigned_to", currentUserEmail);
    if (assignmentFilter === "unassigned") params.set("unassigned", "true");
    if (researcherFilter) params.set("clerk_user_id", researcherFilter);

    try {
      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error("Unauthorized");
      const json: AdminReportsResponse = await res.json();
      setReports(json.reports);
      setMeta(json.pagination);
    } catch (err) {
      console.error('[fetchReports] Error:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterSeverity, search, filterLabelId, assignmentFilter, currentUserEmail, researcherFilter, hasReadUrlFilters]);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/labels');
      if (res.ok) {
        const json = await res.json();
        setAllLabels(json.labels ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchSavedFilters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/saved-filters');
      if (res.ok) {
        const json = await res.json();
        setSavedFilters(json.filters ?? []);
      }
    } catch { /* silent */ }
  }, []);

  // Client-side sorting of current page results
  const sortedReports = [...reports].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: string | number | null | LabelInfo[] = a[sortField];
    let bVal: string | number | null | LabelInfo[] = b[sortField];

    if (Array.isArray(aVal) || Array.isArray(bVal)) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof ReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof ReportRow }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-400">↕</span>;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) {
        setLabelMenuReportId(null);
      }
      if (savedFiltersMenuRef.current && !savedFiltersMenuRef.current.contains(e.target as Node)) {
        setShowSavedFiltersMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    fetchLabels();
    fetchSavedFilters();
  }, [fetchLabels, fetchSavedFilters]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResearcherFilter(params.get("clerk_user_id"));
    setHasReadUrlFilters(true);
  }, []);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) setCurrentUserEmail(storedEmail);
    const storedId = localStorage.getItem('userId');
    if (storedId) setCurrentUserId(storedId);
  }, []);

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, filterStatus, filterSeverity, filterLabelId, search]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function changeFilter(type: "status" | "severity", value: string) {
    if (type === "status")   setFilterStatus(value);
    if (type === "severity") setFilterSeverity(value);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === sortedReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedReports.map((r) => r.id)));
    }
  }

  async function executeBulkAction(action: 'set_status' | 'assign_to_me') {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const body: Record<string, unknown> = { reportIds: Array.from(selectedIds), action };
      if (action === 'set_status') body.status = bulkStatus;

      const res = await fetch('/api/admin/reports/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setBulkToast(`Updated ${json.updated} report(s)${json.skipped ? `, skipped ${json.skipped}` : ''}.`);
        setSelectedIds(new Set());
        setBulkStatus("");
        fetchReports();
      } else {
        setBulkToast(`Error: ${json.error}`);
      }
    } catch {
      setBulkToast('Network error.');
    } finally {
      setBulkLoading(false);
      setTimeout(() => setBulkToast(null), 4000);
    }
  }

  async function createLabel() {
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch('/api/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      if (res.ok) {
        setNewLabelName("");
        setNewLabelColor("#3b82f6");
        fetchLabels();
      }
    } catch { /* silent */ }
  }

  async function deleteLabel(labelId: string) {
    if (!confirm('Delete this label? It will be removed from all reports.')) return;
    await fetch(`/api/admin/labels/${labelId}`, { method: 'DELETE' });
    fetchLabels();
    fetchReports();
  }

  async function addLabelToReport(reportId: string, labelId: string) {
    await fetch(`/api/admin/reports/${reportId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelId }),
    });
    setLabelMenuReportId(null);
    fetchReports();
  }

  async function removeLabelFromReport(reportId: string, labelId: string) {
    await fetch(`/api/admin/reports/${reportId}/labels/${labelId}`, { method: 'DELETE' });
    fetchReports();
  }

  async function saveCurrentFilters() {
    if (!saveFilterName.trim()) return;
    const filterData: Record<string, string | null> = {
      status:   filterStatus !== 'all' ? filterStatus : null,
      severity: filterSeverity !== 'all' ? filterSeverity : null,
      labelId:  filterLabelId,
      assignment: assignmentFilter !== 'all' ? assignmentFilter : null,
      q:        search || null,
    };
    const body = { name: saveFilterName.trim(), filter_json: filterData };
    const res = await fetch('/api/admin/saved-filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setSaveFilterName("");
      setShowSaveFilter(false);
      fetchSavedFilters();
    }
  }

  function applyFilter(sf: SavedFilter) {
    try {
      const f: Record<string, string | null> = JSON.parse(sf.filterJson);
      if (f.status)     setFilterStatus(f.status);
      if (f.severity)   setFilterSeverity(f.severity);
      if (f.labelId)    setFilterLabelId(f.labelId);
      if (f.assignment) setAssignmentFilter(f.assignment as 'all' | 'mine' | 'unassigned');
      if (f.q)          { setSearch(f.q); setSearchInput(f.q); }
      setPage(1);
    } catch { /* malformed */ }
    setShowSavedFiltersMenu(false);
  }

  async function deleteSavedFilter(id: string) {
    await fetch(`/api/admin/saved-filters/${id}`, { method: 'DELETE' });
    fetchSavedFilters();
  }

  async function quickSetStatus(reportId: string, newStatus: string) {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    await fetch(`/api/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchReports();
  }

  const allPageSelected = sortedReports.length > 0 && selectedIds.size === sortedReports.length;
  const someSelected = selectedIds.size > 0 && !allPageSelected;

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Bulk toast */}
      {bulkToast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {bulkToast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛡️ Triage Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Security report triage and management</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLabelManager((v) => !v)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              🏷 Labels
            </button>
          </div>
        </div>

        {/* Label Manager Panel */}
        {showLabelManager && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Manage Labels</h2>
            <div className="flex flex-wrap gap-2">
              {allLabels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: l.color }}>
                  {l.name}
                  <button onClick={() => deleteLabel(l.id)} className="hover:opacity-75 text-[10px]" title="Delete label">✕</button>
                </span>
              ))}
              {allLabels.length === 0 && <p className="text-xs text-gray-400">No labels yet.</p>}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                title="Pick color"
              />
              <button
                onClick={createLabel}
                disabled={!newLabelName.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="New"      value={stats.byStatus?.new ?? 0}      sub="awaiting triage" />
            <StatCard label="Triaged"  value={stats.byStatus?.triaged ?? 0}  />
            <StatCard label="Accepted" value={stats.byStatus?.accepted ?? 0} />
            <StatCard label="Fixed"    value={stats.byStatus?.fixed ?? 0}    />
            <StatCard label="Critical" value={stats.bySeverity?.critical ?? 0} sub="★ high priority" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => changeFilter("status", s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s} {s !== "all" && stats ? `(${stats.byStatus?.[s] ?? 0})` : ""}
              </button>
            ))}
          </div>

          {/* Assignment Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "mine", "unassigned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setAssignmentFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  assignmentFilter === f
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "All Reports" : f === "mine" ? "My Reports" : "Unassigned"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Severity filter */}
            <select
              value={filterSeverity}
              onChange={(e) => changeFilter("severity", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Severities" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            {/* Label filter */}
            <select
              value={filterLabelId ?? ""}
              onChange={(e) => { setFilterLabelId(e.target.value || null); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Labels</option>
              {allLabels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {/* Search */}
            <form onSubmit={applySearch} className="flex gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by title, target, ref ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Saved filters row */}
          <div className="flex gap-2 items-center flex-wrap pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Saved filters:</span>

            <div className="relative" ref={savedFiltersMenuRef}>
              <button
                onClick={() => setShowSavedFiltersMenu((v) => !v)}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                Load ▾
              </button>
              {showSavedFiltersMenu && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
                  {savedFilters.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No saved filters</p>
                  ) : (
                    savedFilters.map((sf) => (
                      <div key={sf.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 gap-2">
                        <button onClick={() => applyFilter(sf)} className="text-xs text-gray-800 text-left flex-1">
                          {sf.name}
                        </button>
                        <button onClick={() => deleteSavedFilter(sf.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {showSaveFilter ? (
              <div className="flex gap-1.5 items-center">
                <input
                  type="text"
                  placeholder="Filter name"
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={saveCurrentFilters}
                  disabled={!saveFilterName.trim()}
                  className="px-2.5 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowSaveFilter(false); setSaveFilterName(""); }}
                  className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveFilter(true)}
                className="px-2.5 py-1.5 text-xs border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-gray-500"
              >
                + Save current
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
            <div className="flex gap-2 items-center flex-wrap flex-1">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Change status to…</option>
                {BULK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <button
                onClick={() => executeBulkAction('set_status')}
                disabled={!bulkStatus || bulkLoading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Apply
              </button>
              {currentUserId && (
                <button
                  onClick={() => executeBulkAction('assign_to_me')}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Assign to me
                </button>
              )}
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Reports table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('refId')}>
                      Ref <SortIcon field="refId" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                      Title <SortIcon field="title" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('target')}>
                      Target <SortIcon field="target" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('severity')}>
                      Severity <SortIcon field="severity" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                      Status <SortIcon field="status" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('assignedTo')}>
                      Assigned <SortIcon field="assignedTo" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('submittedAt')}>
                      Date <SortIcon field="submittedAt" />
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedReports.map((r) => {
                    const attachedLabelIds = new Set(r.labels.map((l) => l.id));
                    const availableLabels = allLabels.filter((l) => !attachedLabelIds.has(l.id));
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(r.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="rounded border-gray-300"
                            aria-label={`Select ${r.refId}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.refId}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{r.title}</p>
                          <p className="text-xs text-gray-400 truncate">{r.vulnType}</p>
                          {r.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.labels.map((l) => (
                                <LabelChip
                                  key={l.id}
                                  label={l}
                                  onRemove={() => removeLabelFromReport(r.id, l.id)}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.target}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold capitalize ${
                              SEVERITY_COLORS[r.severity.toLowerCase()] ?? "text-gray-600 bg-gray-50 border-gray-200"
                            }`}
                          >
                            {r.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ReportStatusBadge status={r.status as never} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.assignedTo ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(r.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick status */}
                            <div className="relative">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    quickSetStatus(r.id, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="appearance-none border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                                title="Quick status change"
                              >
                                <option value="" disabled>⚡</option>
                                {BULK_STATUSES.filter((s) => s !== r.status).map((s) => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                            </div>

                            {/* Label picker */}
                            <div className="relative">
                              <button
                                onClick={() => setLabelMenuReportId(labelMenuReportId === r.id ? null : r.id)}
                                className="px-2 py-1 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-lg transition-colors"
                                title="Add label"
                              >
                                🏷
                              </button>
                              {labelMenuReportId === r.id && (
                                <div ref={labelMenuRef} className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px]">
                                  {availableLabels.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-gray-400">No more labels</p>
                                  ) : (
                                    availableLabels.map((l) => (
                                      <button
                                        key={l.id}
                                        onClick={() => addLabelToReport(r.id, l.id)}
                                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                                        {l.name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>

                            <Link
                              href={`/triage/reports/${r.id}`}
                              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors"
                            >
                              View →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.pages > 1 && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.pages}
              onPageChange={setPage}
              itemsPerPage={meta.per_page}
              totalItems={meta.total}
            />
          )}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
