"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import ReportStatusBadge from "../../../components/ReportStatusBadge";
import AuditLogTimeline, { AuditEntry } from "../../../components/AuditLogTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast {
  message: string;
  type: "success" | "error";
}

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

interface Comment {
  id: string;
  reportId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: number;
}

interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string;
  is_active: number;
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

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  
  // Response templates state
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Hall of Fame visibility state
  const [hallOfFameEntry, setHallOfFameEntry] = useState<{ id: string; isPublic: boolean } | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Self-assignment state
  const [assigningToMe, setAssigningToMe] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [triagers, setTriagers] = useState<Array<{ email: string; name: string }>>([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Fetch triagers list and current user info
    fetch('/api/admin/users')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          const triagerList = data.users
            .filter((u: any) => u.role === 'TRIAGER' || u.role === 'ADMIN')
            .map((u: any) => ({
              email: u.email,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            }));
          setTriagers(triagerList);
          
          // Find current user and set email/role
          const currentEmail = localStorage.getItem('userEmail');
          if (currentEmail) {
            setCurrentUserEmail(currentEmail);
            const currentUser = data.users.find((u: any) => u.email === currentEmail);
            if (currentUser) {
              setCurrentUserRole(currentUser.role);
            }
          }
        }
      })
      .catch((err) => console.error('[fetchTriagers]', err));
  }, []);

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
    
    fetchComments();
    fetchHallOfFameEntry();
    fetchTemplates();
  }, [id]);

  async function fetchHallOfFameEntry() {
    try {
      const res = await fetch(`/api/admin/hall-of-fame/entries`);
      if (res.ok) {
        const data = await res.json();
        const entry = data.entries?.find((e: any) => e.reportId === id);
        if (entry) {
          setHallOfFameEntry({ id: entry.id, isPublic: entry.isPublic });
        }
      }
    } catch (error) {
      console.error('[fetchHallOfFameEntry] Error:', error);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/reports/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("[fetchComments]", err);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/admin/templates?active_only=true');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("[fetchTemplates]", err);
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Replace variables in template body
      let body = template.body;
      
      // Common variable replacements
      const replacements: Record<string, string> = {
        reporter_name: report?.handle || 'Researcher',
        ref_id: report?.ref_id || '',
        title: report?.title || '',
        severity: report?.severity || '',
        target: report?.target || '',
      };
      
      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        body = body.replace(regex, value);
      });
      
      setNewComment(body);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/reports/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      setNewComment("");
      await fetchComments();
      setToast({ message: "Comment posted successfully", type: "success" });
    } catch (err) {
      console.error("[handleSubmitComment]", err);
      setToast({ message: "Failed to post comment. Please try again.", type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  }

  async function applyTransition(newStatus: string) {
    if (!report) return;
    setTriageLoading(newStatus);

    try {
      const res = await fetch(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          severity: triageSeverity,
          assignedTo: triageAssignTo || null,
          comment: triageComment || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      // Refresh
      setToast({ message: `Report status updated to ${newStatus}`, type: "success" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: unknown) {
      setToast({ message: (e as Error).message, type: "error" });
    } finally {
      setTriageLoading(null);
    }
  }

  async function handleAssignToMe() {
    if (!report) return;
    setAssigningToMe(true);

    try {
      const res = await fetch(`/api/admin/reports/${id}/assign-to-me`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign report');
      }

      const data = await res.json();
      setToast({ message: data.message || 'Report assigned to you', type: 'success' });
      
      // Store user email in localStorage for "My Reports" filter
      if (data.assignedTo) {
        localStorage.setItem('userEmail', data.assignedTo);
      }
      
      // Refresh report data
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: unknown) {
      setToast({ message: (e as Error).message, type: 'error' });
    } finally {
      setAssigningToMe(false);
    }
  }

  async function handleToggleVisibility() {
    if (!hallOfFameEntry) return;
    setTogglingVisibility(true);

    try {
      const res = await fetch(`/api/admin/hall-of-fame/${hallOfFameEntry.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublic: !hallOfFameEntry.isPublic,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to toggle visibility');
      }

      // Update local state
      setHallOfFameEntry({
        ...hallOfFameEntry,
        isPublic: !hallOfFameEntry.isPublic,
      });

      setToast({ 
        message: hallOfFameEntry.isPublic ? 'Entry hidden from public' : 'Entry made public', 
        type: "success" 
      });
      fetchHallOfFameEntry();
    } catch (e: unknown) {
      setToast({ message: (e as Error).message, type: "error" });
    } finally {
      setTogglingVisibility(false);
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
          <Link href="/triage" className="hover:text-blue-600 transition-colors">Triage</Link>
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
                  <div className="sm:col-span-2"><span className="text-gray-400">CVSS:</span> <code className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">{report.cvss}</code></div>
                )}
                <div><span className="text-gray-400">Submitted:</span> <span className="font-medium text-gray-900">{new Date(report.created_at).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Report body — decrypted */}
            {report.body && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 text-base">Report Details</h2>
                <div className="prose prose-sm max-w-none text-gray-700 [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-gray-900 [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3">
                  <ReactMarkdown>{report.body}</ReactMarkdown>
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

            {/* Communication Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">💬 Communication with Researcher</h2>
              <p className="text-sm text-gray-500 mb-6">
                Discuss this report with the researcher. All communication is visible to both parties.
              </p>

              {/* Comments List */}
              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No comments yet. Start the conversation below.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm">{comment.authorName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          comment.authorRole === 'ADMIN' ? 'bg-red-100 text-red-700' :
                          comment.authorRole === 'TRIAGER' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {comment.authorRole}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* New Comment Form */}
              <form onSubmit={handleSubmitComment} className="space-y-3">
                {/* Response Templates Dropdown */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      📋 Use Response Template
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a template...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Reply to the researcher or request additional information..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={submittingComment}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            </div>

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

            {/* Hall of Fame Visibility Toggle */}
            {hallOfFameEntry && (report?.status === 'accepted' || report?.status === 'fixed' || report?.status === 'duplicate') && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">👁️ Hall of Fame Visibility</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Control whether this entry appears on the public Hall of Fame page.
                </p>
                <button
                  onClick={handleToggleVisibility}
                  disabled={togglingVisibility}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    hallOfFameEntry.isPublic
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {togglingVisibility ? (
                    <>⏳ Updating...</>
                  ) : hallOfFameEntry.isPublic ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Public - Click to Hide
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Hidden - Click to Make Public
                    </>
                  )}
                </button>
              </div>
            )}

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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assignment</label>
                    <div className="space-y-2">
                      {/* Assign to Me button */}
                      <button
                        onClick={handleAssignToMe}
                        disabled={assigningToMe}
                        className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {assigningToMe ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Assigning...
                          </>
                        ) : report?.assigned_to === currentUserEmail ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Assigned to You
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Assign to Me
                          </>
                        )}
                      </button>

                      {/* Admin override: Assign to someone else (only for admins) */}
                      {currentUserRole === 'ADMIN' && (
                        <select
                          value={triageAssignTo}
                          onChange={(e) => setTriageAssignTo(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Assign to someone else...</option>
                          {triagers.map((t) => (
                            <option key={t.email} value={t.email}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
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
              href="/triage"
              className="block text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              ← Back to all reports
            </Link>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
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
