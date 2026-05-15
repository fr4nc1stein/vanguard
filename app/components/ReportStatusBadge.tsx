import React from "react";
import type { ReportStatus } from "@/lib/db/schema";

const CONFIG: Record<ReportStatus, { label: string; bg: string; text: string; dot: string }> = {
  new:           { label: "New",           bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
  triaged:       { label: "Triaged",       bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  accepted:      { label: "Accepted",      bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500"  },
  rejected:      { label: "Rejected",      bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-400"    },
  fixed:         { label: "Fixed",         bg: "bg-teal-100",   text: "text-teal-800",   dot: "bg-teal-500"   },
  informational: { label: "Informational", bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400"   },
};

export default function ReportStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as ReportStatus] ?? CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
