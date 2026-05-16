"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import ReportStatusBadge from "../../../components/ReportStatusBadge";

interface ReportDetail {
  id: string;
  refId: string;
  handle: string;
  target: string;
  vulnType: string;
  severity: string;
  title: string;
  body: string;
  cvss: string | null;
  status: string;
  assignedTo: string | null;
  pocFiles: string;
  submittedAt: number;
  updatedAt: number;
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

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
  info: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResearcherReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReport();
    fetchComments();
  }, [reportId]);

  async function fetchReport() {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("[fetchReport]", err);
      setError("Failed to load report details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("[fetchComments]", err);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      setNewComment("");
      await fetchComments();
    } catch (err) {
      console.error("[handleSubmitComment]", err);
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading report...</p>
        </div>
        <SiteFooter />
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error || "Report not found"}
          </div>
          <div className="mt-6 text-center">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-blue-600">
            My Submissions
          </Link>
          <span>→</span>
          <span className="text-gray-900 font-medium">{report.refId}</span>
        </div>

        {/* Report Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-blue-600 font-semibold">{report.refId}</span>
                <ReportStatusBadge status={report.status} />
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[report.severity.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
                  {report.severity}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{report.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Target: <strong className="text-gray-700">{report.target}</strong></span>
                <span>Type: <strong className="text-gray-700">{report.vulnType}</strong></span>
                <span>Submitted: <strong className="text-gray-700">{formatDate(report.submittedAt)}</strong></span>
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {report.body}
            </div>
          </div>

          {report.cvss && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">CVSS Vector</h3>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{report.cvss}</code>
            </div>
          )}
        </div>

        {/* Communication Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💬 Communication</h2>
          <p className="text-sm text-gray-500 mb-6">
            Discuss this report with the triage team. All communication is visible to you and the team.
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
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          {/* New Comment Form */}
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask a question or provide additional information..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to My Submissions
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
