"use client";
import React, { useEffect, useState, useCallback } from "react";
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
}

interface AdminReportsResponse {
  reports: ReportRow[];
  pagination: { total: number; page: number; per_page: number; pages: number };
}

const STATUSES = ["all", "new", "triaged", "accepted", "fixed", "rejected", "informational"] as const;
const SEVERITIES = ["all", "critical", "high", "medium", "low", "informational"] as const;

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, per_page: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ReportRow | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (filterStatus !== "all")   params.set("status", filterStatus);
    if (filterSeverity !== "all") params.set("severity", filterSeverity);
    if (search)                   params.set("q", search);

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
  }, [page, filterStatus, filterSeverity, search]);

  // Client-side sorting of current page results
  const sortedReports = [...reports].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    // Handle null values
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort column click
  const handleSort = (field: keyof ReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: keyof ReportRow }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function changeFilter(type: "status" | "severity", value: string) {
    if (type === "status")   { setFilterStatus(value);   }
    if (type === "severity") { setFilterSeverity(value); }
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛡️ Triage Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Security report triage and management</p>
          </div>
        </div>

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
        </div>

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
                  {sortedReports.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.refId}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 truncate">{r.vulnType}</p>
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
                        <Link
                          href={`/triage/reports/${r.id}`}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
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
