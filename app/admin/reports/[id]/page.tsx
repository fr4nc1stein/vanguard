"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import ReportStatusBadge from "../../../components/ReportStatusBadge";
import AuditLogTimeline, { AuditEntry } from "../../../components/AuditLogTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportDetail {
  id: string;
  ref_id: string;
  handle: string | null;
  target: string;
  vuln_type: string;
  severity: string;
  title: string;
  body: string;          // decrypted for TRIAGER/ADMIN
  cvss: string | null;
  status: string;
  assigned_to: string | null;
  poc_files: string[];
  created_at: string;
  updated_at: string;
  audit_logs?: AuditEntry[];
}

const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low", "Info"] as const;

// Valid status transitions (mirrors backend state machine)
const NEXT_STATUSES: Record<string, string[]> = {
  new:           ["triaged", "rejected", "informational"],
  triaged:       ["accepted", "rejected", "informational"],
  accepted:      ["fixed", "rejected"],
  rejected:      ["accepted", "triaged"],
  fixed:         [],
  informational: ["triaged", "new"], // Allow reopening informational reports
};

const TRANSITION_LABELS: Record<string, { label: string; cls: string }> = {
  triaged:       { label: "Mark Triaged",       cls: "bg-purple-600 hover:bg-purple-700" },
  accepted:      { label: "Accept Report",      cls: "bg-green-600 hover:bg-green-700" },
  rejected:      { label: "Reject Report",      cls: "bg-red-600 hover:bg-red-700" },
  informational: { label: "Mark Informational", cls: "bg-gray-500 hover:bg-gray-600" },
  fixed:         { label: "Mark Fixed ✓",       cls: "bg-teal-600 hover:bg-teal-700" },
  new:           { label: "Reopen as New",      cls: "bg-blue-600 hover:bg-blue-700" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminReportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Triage state
  const [triageComment, setTriageComment] = useState("");
  const [triageSeverity, setTriageSeverity] = useState("");
  const [triageAssignTo, setTriageAssignTo] = useState("");
  const [triageLoading, setTriageLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        setReport(data.data ?? data);
        setTriageSeverity(data.data?.severity ?? data.severity ?? "");
        setTriageAssignTo(data.data?.assigned_to ?? data.assigned_to ?? "");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function applyTransition(newStatus: string) {
    if (!report) return;
    setTriageLoading(newStatus);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (triageComment)  body.comment  = triageComment;
      if (triageSeverity) body.severity = triageSeverity;
      if (triageAssignTo) body.assignedTo = triageAssignTo;

      const res = await fetch(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to update");
      }

      // Reload the report
      const refreshed = await fetch(`/api/reports/${id}`).then((r) => r.json());
      setReport(refreshed.data ?? refreshed);
      setTriageComment("");
    } catch (e: unknown) {
      alert(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setTriageLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
          <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-4xl mb-4">🚫</p>
          <p className="text-gray-700 font-medium">{error ?? "Report not found"}</p>
          <Link href="/admin" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const allowedTransitions = NEXT_STATUSES[report.status] ?? [];

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin" className="hover:text-blue-600 transition-colors">Triage</Link>
          <span>›</span>
          <span className="font-mono text-gray-700">{report.ref_id}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left: Report details ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{report.ref_id}</span>
                    <ReportStatusBadge status={report.status as never} />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 break-words">{report.title}</h1>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Target:</span> <span className="font-medium text-gray-900">{report.target}</span></div>
                <div><span className="text-gray-400">Type:</span> <span className="font-medium text-gray-900">{report.vuln_type}</span></div>
                <div><span className="text-gray-400">Severity:</span> <span className="font-medium text-gray-900 capitalize">{report.severity}</span></div>
                <div><span className="text-gray-400">Reporter:</span> <span className="font-medium text-gray-900">{report.handle ?? "Anonymous"}</span></div>
                {report.cvss && (
                  <div className="sm:col-span-2"><span className="text-gray-400">CVSS:</span> <code className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">{report.cvss}</code></div>
                )}
                <div><span className="text-gray-400">Submitted:</span> <span className="font-medium text-gray-900">{new Date(report.created_at).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Report body — decrypted */}
            {report.body && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 text-base">Report Details</h2>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{report.body}</pre>
                </div>
              </div>
            )}

            {/* PoC files */}
            {report.poc_files?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">📎 PoC Attachments</h2>
                <ul className="space-y-2">
                  {report.poc_files.map((key, i) => (
                    <li key={i}>
                      <a
                        href={`/api/files/${encodeURIComponent(key)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>📄</span>
                        <span className="font-mono text-xs">{key.split("/").pop() ?? key}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Audit log */}
            {report.audit_logs && report.audit_logs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">📋 Activity Log</h2>
                <AuditLogTimeline logs={report.audit_logs} />
              </div>
            )}
          </div>

          {/* ── Right: Triage panel ───────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Status transitions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">⚡ Triage Actions</h2>

              {allowedTransitions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No further transitions available
                  {report.status === "fixed" ? " — report is marked fixed" : ""}.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Internal comment</label>
                    <textarea
                      rows={3}
                      value={triageComment}
                      onChange={(e) => setTriageComment(e.target.value)}
                      placeholder="Optional note for audit log…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adjust severity</label>
                    <select
                      value={triageSeverity}
                      onChange={(e) => setTriageSeverity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SEVERITY_LEVELS.map((s) => (
                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assign to (email)</label>
                    <input
                      type="email"
                      value={triageAssignTo}
                      onChange={(e) => setTriageAssignTo(e.target.value)}
                      placeholder="triager@vanguardvdp.ph"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-1 space-y-2">
                    {allowedTransitions.map((status) => {
                      const cfg = TRANSITION_LABELS[status] ?? { label: status, cls: "bg-gray-500" };
                      const busy = triageLoading === status;
                      return (
                        <button
                          key={status}
                          onClick={() => applyTransition(status)}
                          disabled={busy || triageLoading !== null}
                          className={`w-full py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${cfg.cls}`}
                        >
                          {busy && (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick info sidebar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-gray-900">ℹ️ Report Info</h2>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Assigned to</span>
                  <span className="font-medium text-gray-900">{report.assigned_to ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted</span>
                  <span className="font-medium text-gray-900">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last updated</span>
                  <span className="font-medium text-gray-900">{new Date(report.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <Link
              href="/admin"
              className="block text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              ← Back to all reports
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
