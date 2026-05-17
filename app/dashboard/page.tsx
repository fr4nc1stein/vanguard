"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ReportStatusBadge from "../components/ReportStatusBadge";
import Pagination from "../components/Pagination";

interface OwnReport {
  id:          string;
  refId:       string;
  target:      string;
  severity:    string;
  title:       string;
  status:      string;
  submittedAt: number;
}

const SEV: Record<string, string> = {
  Critical: "text-red-700 font-bold",
  High:     "text-orange-700 font-bold",
  Medium:   "text-yellow-700",
  Low:      "text-blue-700",
  Info:     "text-gray-500",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [reports, setReports] = useState<OwnReport[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof OwnReport | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/reports")
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); })
      .catch(() => setError("Failed to load your reports."))
      .finally(() => setLoading(false));
  }, []);

  // Search and filter logic
  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.refId.toLowerCase().includes(query) ||
      report.title.toLowerCase().includes(query) ||
      report.target.toLowerCase().includes(query) ||
      report.severity.toLowerCase().includes(query) ||
      report.status.toLowerCase().includes(query)
    );
  });

  // Sorting logic
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = sortedReports.slice(startIndex, endIndex);

  // Handle sort column click
  const handleSort = (field: keyof OwnReport) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Sort icon component
  const SortIcon = ({ field }: { field: keyof OwnReport }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
            <p className="text-gray-500 text-sm mt-1">Track the status of your vulnerability reports.</p>
          </div>
          <Link
            href="/submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            + New Report
          </Link>
        </div>

        {/* Search Bar */}
        {!loading && reports.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by reference, title, target, severity, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-2">
                Found {filteredReports.length} result{filteredReports.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">{error}</div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No reports yet</h3>
            <p className="text-gray-400 text-sm mb-6">Found a vulnerability? Submit your first report.</p>
            <Link href="/submit" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Submit Report
            </Link>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('refId')}>
                    Reference <SortIcon field="refId" />
                  </th>
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                    Title <SortIcon field="title" />
                  </th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell cursor-pointer hover:bg-gray-100" onClick={() => handleSort('target')}>
                    Target <SortIcon field="target" />
                  </th>
                  <th className="px-5 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('severity')}>
                    Severity <SortIcon field="severity" />
                  </th>
                  <th className="px-5 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-5 py-3 text-right hidden md:table-cell cursor-pointer hover:bg-gray-100" onClick={() => handleSort('submittedAt')}>
                    Submitted <SortIcon field="submittedAt" />
                  </th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedReports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-blue-600 font-semibold">{r.refId}</span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-gray-900 font-medium truncate">{r.title}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-gray-500 text-xs">{r.target}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs ${SEV[r.severity] ?? ""}`}>{r.severity}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ReportStatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-400 hidden md:table-cell">
                      {formatDate(r.submittedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/reports/${r.id}`}
                        className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={sortedReports.length}
            />
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
