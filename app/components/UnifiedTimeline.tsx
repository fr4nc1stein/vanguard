import React from "react";

// ─── Unified Timeline Entry Types ────────────────────────────────────────────

export interface TimelineComment {
  type: 'comment';
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  message: string;
  isInternal: boolean;
  timestamp: number;
}

export interface TimelineAuditLog {
  type: 'audit';
  id: string;
  actorName: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  isInternal: boolean;
  timestamp: number;
}

export type TimelineEntry = TimelineComment | TimelineAuditLog;

// ─── Action Labels ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  report_submitted:  "Report submitted",
  status_changed:    "Status changed",
  severity_changed:  "Severity adjusted",
  assigned:          "Assigned to triager",
  poc_uploaded:      "PoC evidence uploaded",
  report_viewed:     "Report viewed",
  report_decrypted:  "Report body decrypted (staff)",
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getRoleBadgeClass(role: string): string {
  if (role === 'ADMIN') return 'bg-red-100 text-red-700';
  if (role === 'TRIAGER') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-blue-700';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UnifiedTimelineProps {
  entries: TimelineEntry[];
  isStaff?: boolean;
}

export default function UnifiedTimeline({ entries, isStaff = false }: UnifiedTimelineProps) {
  // Filter out internal entries for non-staff users
  const visibleEntries = isStaff 
    ? entries 
    : entries.filter(entry => !entry.isInternal);

  // Sort by timestamp (newest first)
  const sortedEntries = [...visibleEntries].sort((a, b) => b.timestamp - a.timestamp);

  if (sortedEntries.length === 0) {
    return <p className="text-gray-400 text-sm italic">No activity yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-2">
      {sortedEntries.map((entry) => (
        <li key={entry.id} className="pl-6 relative">
          {/* Dot */}
          <span className={`absolute -left-2 top-1 w-3 h-3 bg-white border-2 rounded-full ${
            entry.type === 'comment' ? 'border-green-400' : 'border-blue-400'
          }`} />

          <div className={`rounded-lg border px-4 py-3 ${
            entry.isInternal 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-gray-50 border-gray-100'
          }`}>
            {entry.type === 'comment' ? (
              // ─── Comment Entry ───────────────────────────────────────────
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">{entry.authorName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(entry.authorRole)}`}>
                    {entry.authorRole}
                  </span>
                  {entry.isInternal && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      🔒 Internal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">{entry.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>💬 Comment</span>
                  <span>·</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
              </>
            ) : (
              // ─── Audit Log Entry ─────────────────────────────────────────
              <>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  {entry.isInternal && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      🔒 Internal
                    </span>
                  )}
                </div>

                {/* before → after value */}
                {(entry.oldValue || entry.newValue) && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                    {entry.oldValue && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-mono break-words">{entry.oldValue}</span>
                    )}
                    {entry.oldValue && entry.newValue && (
                      <span className="text-gray-400">→</span>
                    )}
                    {entry.newValue && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded font-mono break-words">{entry.newValue}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{entry.actorName}</span>
                  <span>·</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
