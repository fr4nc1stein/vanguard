"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

interface AnalyticsData {
  summary: {
    totalReports: number;
    recentReports: number;
    avgResponseTimeHours: number;
    resolvedCount: number;
  };
  statusDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  topTargets: Array<{ target: string; count: number }>;
  topReporters: Array<{ handle: string; count: number }>;
  timeSeriesData: Array<{ date: string; count: number }>;
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
  info: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  triaging: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  duplicate: "bg-gray-100 text-gray-700",
  informative: "bg-cyan-100 text-cyan-700",
  not_applicable: "bg-red-100 text-red-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const analytics = await res.json();
      setData(analytics);
    } catch (err) {
      console.error('[fetchAnalytics]', err);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!data) return;

    const csvRows = [
      ['Metric', 'Value'],
      ['Total Reports', data.summary.totalReports],
      ['Recent Reports', data.summary.recentReports],
      ['Avg Response Time (hours)', data.summary.avgResponseTimeHours],
      ['Resolved Reports', data.summary.resolvedCount],
      [''],
      ['Status', 'Count'],
      ...Object.entries(data.statusDistribution).map(([status, count]) => [status, count]),
      [''],
      ['Severity', 'Count'],
      ...Object.entries(data.severityDistribution).map(([severity, count]) => [severity, count]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={exportToCSV}
              disabled={!data}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : data ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900">{data.summary.totalReports}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Recent Reports</p>
                <p className="text-3xl font-bold text-blue-700">{data.summary.recentReports}</p>
                <p className="text-xs text-gray-500 mt-1">Last {days} days</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Avg Response Time</p>
                <p className="text-3xl font-bold text-purple-700">{data.summary.avgResponseTimeHours}h</p>
                <p className="text-xs text-gray-500 mt-1">For resolved reports</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-700">{data.summary.resolvedCount}</p>
                <p className="text-xs text-gray-500 mt-1">Accepted/Duplicate/Resolved</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Severity Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Severity Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(data.severityDistribution).map(([severity, count]) => {
                    const total = Object.values(data.severityDistribution).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={severity}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{severity}</span>
                          <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${SEVERITY_COLORS[severity]?.replace('bg-', 'bg-').split(' ')[0] || 'bg-gray-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Status Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(data.statusDistribution).map(([status, count]) => {
                    const total = Object.values(data.statusDistribution).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                          <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${STATUS_COLORS[status]?.split(' ')[0] || 'bg-gray-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reports Over Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Reports Over Time (Last {days} days)</h3>
              <div className="h-64 flex items-end gap-1">
                {data.timeSeriesData.map((item, idx) => {
                  const maxCount = Math.max(...data.timeSeriesData.map(d => d.count), 1);
                  const height = (item.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${height * 2}px`, minHeight: item.count > 0 ? '4px' : '0' }}
                          title={`${item.date}: ${item.count} reports`}
                        />
                      </div>
                      {idx % Math.ceil(data.timeSeriesData.length / 7) === 0 && (
                        <span className="text-[10px] text-gray-400 mt-1 rotate-45 origin-top-left">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Tables */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Targets */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Targets</h3>
                <div className="space-y-2">
                  {data.topTargets.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-mono text-gray-700">{item.target}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Reporters */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Reporters</h3>
                <div className="space-y-2">
                  {data.topReporters.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{item.handle}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>Failed to load analytics data</p>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
