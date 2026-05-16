"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ReportStatusBadge from "../components/ReportStatusBadge";

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

  useEffect(() => {
    fetch("/api/reports")
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); })
      .catch(() => setError("Failed to load your reports."))
      .finally(() => setLoading(false));
  }, []);

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
                  <th className="px-5 py-3 text-left">Reference</th>
                  <th className="px-5 py-3 text-left">Title</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">Target</th>
                  <th className="px-5 py-3 text-center">Severity</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">Submitted</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
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
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
