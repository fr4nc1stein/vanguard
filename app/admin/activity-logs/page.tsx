"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

interface ActivityLog {
  id: string;
  report_id: string | null;
  actor_id: string;
  actor_name?: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  ip_hash: string | null;
  timestamp: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

const ACTION_TYPES = [
  'report_submitted',
  'status_changed',
  'severity_changed',
  'assigned',
  'poc_uploaded',
  'report_viewed',
  'report_decrypted',
];

const ACTION_ICONS: Record<string, string> = {
  report_submitted: '📝',
  status_changed: '🔄',
  severity_changed: '⚠️',
  assigned: '👤',
  poc_uploaded: '📎',
  report_viewed: '👁️',
  report_decrypted: '🔓',
};

const ACTION_COLORS: Record<string, string> = {
  report_submitted: 'bg-blue-100 text-blue-700',
  status_changed: 'bg-green-100 text-green-700',
  severity_changed: 'bg-orange-100 text-orange-700',
  assigned: 'bg-purple-100 text-purple-700',
  poc_uploaded: 'bg-indigo-100 text-indigo-700',
  report_viewed: 'bg-gray-100 text-gray-700',
  report_decrypted: 'bg-yellow-100 text-yellow-700',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Export loading
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter, startDate, endDate]);

  async function fetchLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '50');
      
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const res = await fetch(`/api/admin/activity-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('[fetchLogs]', error);
      setToast({ message: 'Failed to load activity logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const res = await fetch(`/api/admin/activity-logs/export?${params}`);
      if (!res.ok) throw new Error('Failed to export logs');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setToast({ message: 'Logs exported successfully!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' });
    } finally {
      setExporting(false);
    }
  }

  function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatAction(action: string) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.actor_name?.toLowerCase().includes(query) ||
      log.report_id?.toLowerCase().includes(query) ||
      log.old_value?.toLowerCase().includes(query) ||
      log.new_value?.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>
              <span>›</span>
              <span className="text-gray-700">Activity Logs</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">📋 Activity Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track all platform activities and admin actions
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total Logs:</span>
              <span className="ml-2 font-semibold text-gray-900">{total.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Showing:</span>
              <span className="ml-2 font-semibold text-gray-900">{filteredLogs.length} logs</span>
            </div>
            <div>
              <span className="text-gray-500">Page:</span>
              <span className="ml-2 font-semibold text-gray-900">{currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map((action) => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(actionFilter || startDate || endDate || searchQuery) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setActionFilter('');
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading activity logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No activity logs found</h3>
            <p className="text-gray-400 text-sm">
              {searchQuery || actionFilter || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Activity logs will appear here as actions are performed'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                      ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {ACTION_ICONS[log.action] || '📌'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{formatAction(log.action)}</h3>
                        <p className="text-sm text-gray-500">
                          by <span className="font-medium text-gray-700">{log.actor_name || 'System'}</span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-sm">
                      {log.report_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Report:</span>
                          <Link
                            href={`/triage/reports/${log.report_id}`}
                            className="font-mono text-blue-600 hover:text-blue-700 text-xs"
                          >
                            {log.report_id}
                          </Link>
                        </div>
                      )}

                      {(log.old_value || log.new_value) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {log.old_value && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">
                              {log.old_value}
                            </span>
                          )}
                          {log.old_value && log.new_value && (
                            <span className="text-gray-400">→</span>
                          )}
                          {log.new_value && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                              {log.new_value}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
