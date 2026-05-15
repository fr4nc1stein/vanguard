import React from "react";

// Minimal interface — accepts data from both the DB layer and API responses
export interface AuditEntry {
  id: string;
  actorEmail?: string | null;
  actorId?: string | null;
  actor_email?: string | null;
  actor_id?: string | null;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  timestamp: number | string;
}

const ACTION_LABELS: Record<string, string> = {
  report_submitted:  "Report submitted",
  status_changed:    "Status changed",
  severity_changed:  "Severity adjusted",
  assigned:          "Assigned to triager",
  poc_uploaded:      "PoC evidence uploaded",
  report_viewed:     "Report viewed",
  report_decrypted:  "Report body decrypted (staff)",
};

function formatTs(ts: number | string): string {
  return new Date(typeof ts === "number" ? ts : ts).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogTimeline({ logs }: { logs: AuditEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-gray-400 text-sm italic">No audit history yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-2">
      {logs.map((log) => (
        <li key={log.id} className="pl-6 relative">
          {/* Dot */}
          <span className="absolute -left-2 top-1 w-3 h-3 bg-white border-2 border-blue-400 rounded-full" />

          <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">
              {ACTION_LABELS[log.action] ?? log.action}
            </p>

            {/* before → after value */}
            {((log.oldValue ?? log.old_value) ?? (log.newValue ?? log.new_value)) && (
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                {(log.oldValue ?? log.old_value) && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-mono">{log.oldValue ?? log.old_value}</span>
                )}
                {(log.oldValue ?? log.old_value) && (log.newValue ?? log.new_value) && (
                  <span className="text-gray-400">→</span>
                )}
                {(log.newValue ?? log.new_value) && (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded font-mono">{log.newValue ?? log.new_value}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{log.actorEmail ?? log.actor_email ?? log.actorId ?? log.actor_id}</span>
              <span>·</span>
              <span>{formatTs(log.timestamp)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
