"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

// ─── Scope interface ──────────────────────────────────────────────────────────
interface Scope {
  id: string;
  domain: string;
  description: string | null;
  targetType: string;
  status: string;
}

// ─── Vulnerability categories ─────────────────────────────────────────────────
const VULN_TYPES = [
  "Broken Access Control",
  "Cryptographic Failure",
  "Injection (SQL / XSS / Command / SSTI)",
  "Insecure Design",
  "Security Misconfiguration",
  "Vulnerable or Outdated Component",
  "Authentication / Session Failure",
  "Software & Data Integrity Failure",
  "SSRF (Server-Side Request Forgery)",
  "Business Logic Flaw",
  "Information Disclosure / Data Leak",
  "IDOR (Insecure Direct Object Reference)",
  "Open Redirect",
  "Clickjacking / UI Redressing",
  "CORS Misconfiguration",
  "Path Traversal / File Inclusion",
  "Other",
];

// ─── Severity definitions ─────────────────────────────────────────────────────
const SEVERITIES = [
  {
    value: "Critical",
    desc: "RCE, full data breach, account takeover at scale",
    ring: "ring-red-400",
    active: "bg-red-100 border-red-400 text-red-800",
    idle: "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  },
  {
    value: "High",
    desc: "Significant data exposure, privilege escalation",
    ring: "ring-orange-400",
    active: "bg-orange-100 border-orange-400 text-orange-800",
    idle: "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  },
  {
    value: "Medium",
    desc: "Limited impact, partial data exposure",
    ring: "ring-yellow-400",
    active: "bg-yellow-100 border-yellow-400 text-yellow-800",
    idle: "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  },
  {
    value: "Low",
    desc: "Minimal impact, low exploitability",
    ring: "ring-blue-400",
    active: "bg-blue-100 border-blue-400 text-blue-800",
    idle: "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  },
  {
    value: "Info",
    desc: "Informational, no direct impact",
    ring: "ring-gray-400",
    active: "bg-gray-100 border-gray-400 text-gray-700",
    idle: "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  },
] as const;

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormData {
  target: string;
  vulnType: string;
  severity: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  impact: string;
  cvss: string;
  evidence: string;
  agreed: boolean;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = {
  target: "",
  vulnType: "",
  severity: "",
  title: "",
  description: "",
  stepsToReproduce: "",
  impact: "",
  cvss: "",
  evidence: "",
  agreed: false,
};

function generateLocalRef() {
  return `VDP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p data-field-error className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
    err ? "border-red-400" : "border-gray-300"
  }`;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubmitReport() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(true);

  // Fetch active scopes from API
  useEffect(() => {
    async function fetchScopes() {
      try {
        const res = await fetch('/api/scopes');
        if (res.ok) {
          const data = await res.json();
          setScopes(data.scopes || []);
        }
      } catch (err) {
        console.error('[fetchScopes] Error:', err);
      } finally {
        setLoadingScopes(false);
      }
    }
    fetchScopes();
  }, []);
  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.target)                               e.target           = "Please select a target";
    if (!form.vulnType)                             e.vulnType         = "Please select a vulnerability type";
    if (!form.severity)                             e.severity         = "Please select a severity level";
    if (!form.title.trim())                         e.title            = "Title is required";
    else if (form.title.trim().length < 10)         e.title            = "Title must be at least 10 characters";
    if (!form.description.trim())                   e.description      = "Description is required";
    else if (form.description.trim().length < 30)   e.description      = "Description must be at least 30 characters";
    if (!form.stepsToReproduce.trim())              e.stepsToReproduce = "Steps to reproduce are required";
    else if (form.stepsToReproduce.trim().length < 20) e.stepsToReproduce = "Steps must be at least 20 characters";
    if (!form.impact.trim())                        e.impact           = "Impact description is required";
    else if (form.impact.trim().length < 20)        e.impact           = "Impact must be at least 20 characters";
    if (!form.agreed)                               e.agreed           = "You must accept the disclosure policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const { agreed: _agreed, ...reportPayload } = form;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Map server-side validation errors back onto fields
        if (res.status === 422 && data.details) {
          const serverErrors: FormErrors = {};
          for (const [field, msgs] of Object.entries(data.details as Record<string, string[]>)) {
            serverErrors[field as keyof FormData] = (msgs as string[])[0];
          }
          setErrors(serverErrors);
          document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // In dev, show the detail message so issues are visible immediately
          const msg = (data.detail ?? data.error) as string | undefined;
          setSubmitError(msg ?? 'Submission failed. Please try again.');
        }
        return;
      }

      setReferenceId(data.referenceId ?? data.ref_id ?? null);
      if (!data.referenceId && !data.ref_id) {
        setSubmitError('Report submitted but no reference ID was returned. Contact security@vanguardvdp.ph.');
      }
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (referenceId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <div className="text-5xl mb-5">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Received!</h2>
            <p className="text-gray-500 mb-6">
              Thank you for helping make Vanguard VDP more secure.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-8 py-5 mb-6 inline-block">
              <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">
                Your Reference Number
              </p>
              <p className="text-2xl font-mono font-bold text-blue-700">{referenceId}</p>
            </div>

            <p className="text-sm text-gray-600 mb-8">
              We will acknowledge your report within <strong>48 hours</strong> and provide a full response within{" "}
              <strong>7 business days</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                View My Reports
              </Link>
              <button
                onClick={() => { setReferenceId(null); setForm(EMPTY); setErrors({}); }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Page hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🐛</span>
            <h1 className="text-2xl font-bold text-gray-900">Submit Vulnerability Report</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Sign in to submit a report and track its status in your dashboard.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* In-scope targets info */}
        <div className="bg-blue-800 border border-blue-700 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3">📋 In-Scope Targets</h3>
          {loadingScopes ? (
            <div className="text-center py-4 text-blue-300 text-sm">Loading scopes...</div>
          ) : scopes.length === 0 ? (
            <div className="text-center py-4 text-blue-300 text-sm">No active scopes available</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {scopes.map((scope) => (
                <div key={scope.id} className="flex items-start gap-2 text-sm">
                  <span className="w-2 h-2 bg-blue-300 rounded-full flex-shrink-0 mt-1.5" />
                  <div>
                    <span className="text-blue-300 font-medium">{scope.domain}</span>
                    {scope.description && (
                      <p className="text-xs text-blue-400 mt-0.5">{scope.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-blue-400 mt-4">
            <Link href="/" className="hover:underline">See full scope rules and out-of-scope exclusions →</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">



          {/* ── Section: Target & Classification ─────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">🎯 Target & Classification</h3>
            <div className="space-y-4">

              <Field label="Target" required error={errors.target}>
                <select
                  value={form.target}
                  onChange={(e) => set("target", e.target.value)}
                  className={inputCls(errors.target)}
                  data-error={errors.target ? true : undefined}
                  disabled={loadingScopes}
                >
                  <option value="">{loadingScopes ? 'Loading scopes...' : 'Select a target…'}</option>
                  {scopes.map((scope) => (
                    <option key={scope.id} value={scope.domain}>
                      {scope.domain}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Vulnerability Type" required error={errors.vulnType}>
                <select
                  value={form.vulnType}
                  onChange={(e) => set("vulnType", e.target.value)}
                  className={inputCls(errors.vulnType)}
                  data-error={errors.vulnType ? true : undefined}
                >
                  <option value="">Select a type…</option>
                  {VULN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              {/* Severity card picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("severity", s.value)}
                      className={`border-2 rounded-xl px-2 py-3 text-center transition-all ${
                        form.severity === s.value
                          ? `${s.active} ring-2 ring-offset-1 ${s.ring}`
                          : s.idle
                      }`}
                    >
                      <div className="font-semibold text-sm">{s.value}</div>
                      <div className="text-xs mt-0.5 opacity-70 leading-tight hidden sm:block">
                        {s.desc}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.severity && (
                  <p className="text-xs text-red-500 mt-1" data-error>{errors.severity}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section: Vulnerability Details ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">🔍 Vulnerability Details</h3>
            <div className="space-y-4">

              <Field label="Title" required error={errors.title}>
                <input
                  type="text"
                  placeholder="e.g. IDOR in laet4x.com user endpoint allows unauthorized modification"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputCls(errors.title)}
                  maxLength={200}
                  data-error={errors.title ? true : undefined}
                />
              </Field>

              <Field
                label="Description"
                required
                error={errors.description}
                hint="Describe the vulnerability, the affected endpoint/component, and what you observed."
              >
                <textarea
                  rows={5}
                  placeholder="The /api/user/{id}/edit endpoint does not verify that the authenticated user owns the resource. By changing the ID parameter in the request, an attacker can modify data belonging to other users."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={`${inputCls(errors.description)} resize-y`}
                  data-error={errors.description ? true : undefined}
                />
              </Field>

              <Field
                label="Steps to Reproduce"
                required
                error={errors.stepsToReproduce}
                hint="Number each step clearly so the team can reproduce the issue."
              >
                <textarea
                  rows={6}
                  placeholder={"1. Log in as User A\n2. Note your resource ID (e.g. /api/user/123)\n3. Log in as User B\n4. Send a PATCH request to /api/user/123 with modified data\n5. Observe the resource is updated despite User B not being the owner"}
                  value={form.stepsToReproduce}
                  onChange={(e) => set("stepsToReproduce", e.target.value)}
                  className={`${inputCls(errors.stepsToReproduce)} resize-y font-mono text-xs`}
                  data-error={errors.stepsToReproduce ? true : undefined}
                />
              </Field>

              <Field
                label="Impact"
                required
                error={errors.impact}
                hint="Explain the real-world business and security impact."
              >
                <textarea
                  rows={3}
                  placeholder="An attacker can modify or delete any user's data on laet4x.com, causing loss of data integrity and trust in the platform."
                  value={form.impact}
                  onChange={(e) => set("impact", e.target.value)}
                  className={`${inputCls(errors.impact)} resize-y`}
                  data-error={errors.impact ? true : undefined}
                />
              </Field>
            </div>
          </div>

          {/* ── Section: Additional Info ──────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              📎 Additional Information{" "}
              <span className="text-gray-400 font-normal text-sm">(optional)</span>
            </h3>
            <div className="space-y-4">
              <Field
                label="CVSS Score"
                hint="e.g. CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N (Score: 8.1)"
              >
                <input
                  type="text"
                  placeholder="e.g. 7.5 (High)"
                  value={form.cvss}
                  onChange={(e) => set("cvss", e.target.value)}
                  className={inputCls()}
                  maxLength={200}
                />
              </Field>

              <Field
                label="Supporting Evidence / Links"
                hint="PoC URLs, screenshots, screen recordings, Burp Suite exports, CVE references."
              >
                <textarea
                  rows={3}
                  placeholder="https://drive.google.com/... (screenshot)&#10;https://asciinema.org/... (recording)"
                  value={form.evidence}
                  onChange={(e) => set("evidence", e.target.value)}
                  className={`${inputCls()} resize-y`}
                />
              </Field>
            </div>
          </div>

          {/* ── Disclosure agreement ──────────────────────────────────────── */}
          <div className={`rounded-xl border p-4 ${errors.agreed ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => set("agreed", e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                data-error={errors.agreed ? true : undefined}
              />
              <span className="text-sm text-gray-700">
                I confirm I have read and agree to the{" "}
                <Link href="/" className="text-blue-600 hover:underline font-medium">
                  Responsible Disclosure Policy
                </Link>
                . I have not exploited this vulnerability beyond what was necessary to confirm its existence,
                and I have not accessed, modified, or exfiltrated user data without authorisation.
              </span>
            </label>
            {errors.agreed && (
              <p className="text-xs text-red-500 mt-2 ml-7">{errors.agreed}</p>
            )}
          </div>

          {/* ── Submit error banner ──────────────────────────────────────── */}
          {submitError && (
            <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="text-lg leading-tight">⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting…
              </>
            ) : (
              "🐛 Submit Vulnerability Report"
            )}
          </button>

          <p className="text-xs text-center text-gray-400 pb-4">
            By submitting you agree to our{" "}
            <Link href="/" className="hover:underline">Responsible Disclosure Policy</Link>.
            Reports are reviewed by our security team — no automated triage.
          </p>
        </form>
      </div>

      <SiteFooter />
    </main>
  );
}
