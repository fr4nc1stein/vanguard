"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scope {
  id: string;
  domain: string;
  description: string | null;
  targetType: string;
  status: string;
  allowedVulnTypes: string | null;
  severityRestriction: string | null;
  notes: string | null;
  exclusionPaths: string | null;
}

interface SimilarReport {
  id: string;
  refId: string;
  title: string;
  status: string;
  severity: string;
}

// ─── Vuln types & severities ──────────────────────────────────────────────────

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

// ─── Vuln templates ───────────────────────────────────────────────────────────

interface VulnTemplate {
  description: string;
  stepsToReproduce: string;
  impact: string;
}

const TEMPLATES: Partial<Record<string, VulnTemplate>> = {
  "IDOR (Insecure Direct Object Reference)": {
    description:
      "The [endpoint] endpoint does not verify that the authenticated user owns the requested resource. By manipulating the object ID in the request, an attacker can access or modify data belonging to other users.",
    stepsToReproduce:
      "1. Log in as User A\n2. Note your resource ID (e.g. /api/resource/123)\n3. Log in as User B in a separate session\n4. Send a request to /api/resource/123 as User B\n5. Observe that User B can access or modify User A's resource",
    impact:
      "An attacker can read, modify, or delete any user's data without authorisation, violating confidentiality and integrity of user-owned resources.",
  },
  "Injection (SQL / XSS / Command / SSTI)": {
    description:
      "The [parameter/field] at [endpoint] does not sanitise user input before including it in [SQL queries / HTML output / shell commands / template rendering]. An attacker can inject malicious payloads to [exfiltrate data / execute scripts / run OS commands].",
    stepsToReproduce:
      "1. Navigate to [the vulnerable page/endpoint]\n2. Locate the [input field / parameter]\n3. Insert the following payload: [your payload here]\n4. Submit the request\n5. Observe [the injected behaviour / error / output]",
    impact:
      "Successful exploitation allows an attacker to [describe impact: read database contents / steal session cookies / execute arbitrary OS commands], potentially leading to full system compromise.",
  },
  "Broken Access Control": {
    description:
      "The application does not enforce proper authorisation checks on [endpoint / feature]. Users with [low-privilege role] can perform actions or access resources that should be restricted to [admin / higher-privilege] users.",
    stepsToReproduce:
      "1. Log in as a low-privilege user\n2. Directly navigate to or call [the restricted endpoint]\n3. Observe that the action succeeds without authorisation\n4. Confirm by observing [state change / data returned]",
    impact:
      "Unauthorised users can perform privileged actions such as [describe action], leading to data exposure, privilege escalation, or destructive operations.",
  },
  "SSRF (Server-Side Request Forgery)": {
    description:
      "The [endpoint] accepts a user-supplied URL and makes a server-side HTTP request without validating the destination. An attacker can supply internal or cloud-metadata URLs to probe internal services.",
    stepsToReproduce:
      "1. Identify the parameter that accepts a URL (e.g. `url`, `webhook`, `callback`)\n2. Submit a request with the value set to `http://169.254.169.254/latest/meta-data/` (AWS metadata) or `http://localhost:[port]/`\n3. Observe the response contains data from the internal request",
    impact:
      "An attacker can enumerate internal services, read cloud provider metadata (including IAM credentials), or pivot to internal network resources not otherwise reachable.",
  },
  "Authentication / Session Failure": {
    description:
      "The application's authentication or session management is flawed. [Describe the specific weakness: e.g. session tokens are not invalidated on logout / weak password reset tokens / JWT signature not verified].",
    stepsToReproduce:
      "1. [Step to trigger the authentication flow]\n2. [Step showing the flaw, e.g. intercept the request / reuse a token]\n3. Observe that access is granted without valid credentials",
    impact:
      "An attacker can gain unauthorised access to user accounts or administrative functions, leading to account takeover or privilege escalation.",
  },
  "Information Disclosure / Data Leak": {
    description:
      "The [endpoint / error response / HTTP header / file] exposes sensitive information that should not be accessible. This includes [describe: stack traces / internal paths / API keys / PII / source code].",
    stepsToReproduce:
      "1. [Navigate to or call the endpoint]\n2. [Trigger the condition: e.g. send a malformed request / access the path directly]\n3. Observe the response contains [the sensitive data]",
    impact:
      "Exposed information can be leveraged by an attacker to plan further attacks, compromise accounts, or violate user privacy and applicable data protection regulations.",
  },
  "Path Traversal / File Inclusion": {
    description:
      "The [endpoint] accepts a file path parameter and reads or includes files without sanitising directory traversal sequences (`../`). An attacker can read arbitrary files from the server filesystem.",
    stepsToReproduce:
      "1. Identify the parameter that accepts a filename or path\n2. Replace the value with `../../../../etc/passwd` (or equivalent)\n3. URL-encode traversal sequences if necessary\n4. Observe the response contains the contents of the target file",
    impact:
      "An attacker can read sensitive server files including credentials, private keys, application configuration, and operating system files, enabling further compromise.",
  },
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
    err ? "border-red-400" : "border-gray-300"
  }`;

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

const SEV_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High:     "bg-orange-100 text-orange-800",
  Medium:   "bg-yellow-100 text-yellow-800",
  Low:      "bg-blue-100 text-blue-800",
  Info:     "bg-gray-100 text-gray-700",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Target & Classification" },
    { n: 2, label: "Vulnerability Details" },
    { n: 3, label: "Review & Submit" },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step > s.n
                    ? "bg-green-500 text-white"
                    : step === s.n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  step === s.n ? "text-blue-700" : step > s.n ? "text-green-600" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 rounded ${step > s.n ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubmitReport() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(true);

  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  const [duplicates, setDuplicates] = useState<SimilarReport[]>([]);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedScope = scopes.find((s) => s.domain === form.target) ?? null;
  const allowedVulnTypes: string[] = selectedScope?.allowedVulnTypes
    ? JSON.parse(selectedScope.allowedVulnTypes) : [];
  const allowedSeverities: string[] = selectedScope?.severityRestriction
    ? JSON.parse(selectedScope.severityRestriction) : [];
  const availableTemplate = TEMPLATES[form.vulnType] ?? null;

  // ── Load scopes ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/scopes")
      .then((r) => r.json())
      .then((d) => setScopes(d.scopes ?? []))
      .catch(() => {})
      .finally(() => setLoadingScopes(false));
  }, []);

  // ── Load draft on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => {
        if (d.draft?.data) {
          setForm((prev) => ({ ...prev, ...d.draft.data, agreed: false }));
        }
      })
      .catch(() => {})
      .finally(() => { initialLoadDone.current = true; });
  }, []);

  // ── Auto-save draft (debounced 1.5s) ────────────────────────────────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const hasContent = form.target || form.title || form.description || form.vulnType;
    if (!hasContent) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(async () => {
      setDraftStatus("saving");
      try {
        const draftData = {
          target: form.target,
          vulnType: form.vulnType,
          severity: form.severity,
          title: form.title,
          description: form.description,
          stepsToReproduce: form.stepsToReproduce,
          impact: form.impact,
          cvss: form.cvss,
          evidence: form.evidence,
        };
        await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: draftData }),
        });
        setDraftStatus("saved");
        setTimeout(() => setDraftStatus("idle"), 2000);
      } catch {
        setDraftStatus("idle");
      }
    }, 1500);

    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [form]);

  // ── Duplicate check (debounced 800ms, step 2 only) ───────────────────────────
  useEffect(() => {
    if (step !== 2 || form.title.length < 10) {
      setDuplicates([]);
      return;
    }
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    dupTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/reports/similar?title=${encodeURIComponent(form.title)}`);
        const d = await res.json();
        setDuplicates(d.similar ?? []);
      } catch {
        setDuplicates([]);
      }
    }, 800);
    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
  }, [form.title, step]);

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function applyTemplate() {
    if (!availableTemplate) return;
    setForm((prev) => ({
      ...prev,
      description: availableTemplate.description,
      stepsToReproduce: availableTemplate.stepsToReproduce,
      impact: availableTemplate.impact,
    }));
  }

  // ── Step validation ──────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: FormErrors = {};
    if (!form.target)   e.target   = "Please select a target";
    if (!form.vulnType) e.vulnType = "Please select a vulnerability type";
    if (!form.severity) e.severity = "Please select a severity level";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: FormErrors = {};
    if (!form.title.trim())                            e.title            = "Title is required";
    else if (form.title.trim().length < 10)            e.title            = "Title must be at least 10 characters";
    if (!form.description.trim())                      e.description      = "Description is required";
    else if (form.description.trim().length < 30)      e.description      = "Description must be at least 30 characters";
    if (!form.stepsToReproduce.trim())                 e.stepsToReproduce = "Steps to reproduce are required";
    else if (form.stepsToReproduce.trim().length < 20) e.stepsToReproduce = "Steps must be at least 20 characters";
    if (!form.impact.trim())                           e.impact           = "Impact description is required";
    else if (form.impact.trim().length < 20)           e.impact           = "Impact must be at least 20 characters";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  }

  function goBack() {
    setErrors({});
    setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreed) {
      setErrors({ agreed: "You must accept the disclosure policy" });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        target: form.target,
        vulnType: form.vulnType,
        severity: form.severity,
        title: form.title,
        description: form.description,
        stepsToReproduce: form.stepsToReproduce,
        impact: form.impact,
        cvss: form.cvss,
        evidence: form.evidence,
      };
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.details) {
          const serverErrors: FormErrors = {};
          for (const [field, msgs] of Object.entries(data.details as Record<string, string[]>)) {
            serverErrors[field as keyof FormData] = (msgs as string[])[0];
          }
          setErrors(serverErrors);
          // Go back to the step that has the error
          const step1Fields = ["target", "vulnType", "severity"];
          const step2Fields = ["title", "description", "stepsToReproduce", "impact"];
          if (step1Fields.some((f) => serverErrors[f as keyof FormData])) setStep(1);
          else if (step2Fields.some((f) => serverErrors[f as keyof FormData])) setStep(2);
        } else {
          setSubmitError((data.detail ?? data.error) ?? "Submission failed. Please try again.");
        }
        return;
      }
      // Clear draft after successful submission
      fetch("/api/drafts", { method: "DELETE" }).catch(() => {});
      setReferenceId(data.referenceId ?? null);
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (referenceId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <div className="text-5xl mb-5">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Received!</h2>
            <p className="text-gray-500 mb-6">Thank you for helping make Vanguard VDP more secure.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-8 py-5 mb-6 inline-block">
              <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Your Reference Number</p>
              <p className="text-2xl font-mono font-bold text-blue-700">{referenceId}</p>
            </div>
            <p className="text-sm text-gray-600 mb-8">
              We will acknowledge your report within <strong>48 hours</strong> and provide a full response within{" "}
              <strong>7 business days</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors">
                View My Reports
              </Link>
              <button
                onClick={() => { setReferenceId(null); setForm(EMPTY); setErrors({}); setStep(1); }}
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

  // ── Wizard layout ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🐛</span>
              <h1 className="text-2xl font-bold text-gray-900">Submit Vulnerability Report</h1>
            </div>
            {draftStatus === "saving" && <span className="text-xs text-gray-400">Saving draft…</span>}
            {draftStatus === "saved"  && <span className="text-xs text-green-600">Draft saved ✓</span>}
          </div>
          <p className="text-gray-500 text-sm">Sign in to submit a report and track its status in your dashboard.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <StepIndicator step={step} />

        {/* ── Step 1: Target & Classification ─────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="bg-blue-800 border border-blue-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3">📋 In-Scope Targets</h3>
              {loadingScopes ? (
                <div className="text-center py-4 text-blue-300 text-sm">Loading scopes…</div>
              ) : scopes.length === 0 ? (
                <div className="text-center py-4 text-blue-300 text-sm">No active scopes available</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {scopes.map((scope) => (
                    <div key={scope.id} className="flex items-start gap-2 text-sm">
                      <span className="w-2 h-2 bg-blue-300 rounded-full flex-shrink-0 mt-1.5" />
                      <div>
                        <span className="text-blue-300 font-medium">{scope.domain}</span>
                        {scope.description && <p className="text-xs text-blue-400 mt-0.5">{scope.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-blue-400 mt-4">
                <Link href="/" className="hover:underline">See full scope rules and out-of-scope exclusions →</Link>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">🎯 Target & Classification</h3>

              <Field label="Target" required error={errors.target}>
                <select
                  value={form.target}
                  onChange={(e) => set("target", e.target.value)}
                  className={inputCls(errors.target)}
                  disabled={loadingScopes}
                >
                  <option value="">{loadingScopes ? "Loading scopes…" : "Select a target…"}</option>
                  {scopes.map((scope) => (
                    <option key={scope.id} value={scope.domain}>{scope.domain}</option>
                  ))}
                </select>
              </Field>

              {selectedScope && (allowedVulnTypes.length > 0 || allowedSeverities.length > 0 || selectedScope.notes || selectedScope.exclusionPaths) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs text-amber-800">
                  <p className="font-semibold">⚠️ Scope restrictions for {selectedScope.domain}</p>
                  {allowedVulnTypes.length > 0 && <p><span className="font-medium">Accepted types:</span> {allowedVulnTypes.join(", ")}</p>}
                  {allowedSeverities.length > 0 && <p><span className="font-medium">Accepted severities:</span> {allowedSeverities.join(", ")}</p>}
                  {selectedScope.notes && <p><span className="font-medium">Notes:</span> {selectedScope.notes}</p>}
                  {selectedScope.exclusionPaths && <p><span className="font-medium">Exclusions:</span> {selectedScope.exclusionPaths}</p>}
                </div>
              )}

              <Field label="Vulnerability Type" required error={errors.vulnType}>
                <select
                  value={form.vulnType}
                  onChange={(e) => set("vulnType", e.target.value)}
                  className={inputCls(errors.vulnType)}
                >
                  <option value="">Select a type…</option>
                  {(allowedVulnTypes.length > 0 ? allowedVulnTypes : VULN_TYPES).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SEVERITIES.filter((s) => allowedSeverities.length === 0 || allowedSeverities.includes(s.value)).map((s) => (
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
                      <div className="text-xs mt-0.5 opacity-70 leading-tight hidden sm:block">{s.desc}</div>
                    </button>
                  ))}
                </div>
                {errors.severity && <p className="text-xs text-red-500 mt-1" data-field-error>{errors.severity}</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Next Step →
            </button>
          </>
        )}

        {/* ── Step 2: Vulnerability Details ────────────────────────────────── */}
        {step === 2 && (
          <>
            {/* Template picker */}
            {availableTemplate && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">📄 Template available for {form.vulnType}</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Pre-fill the fields below with a starter template — you can edit it freely.</p>
                  </div>
                  <button
                    type="button"
                    onClick={applyTemplate}
                    className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">🔍 Vulnerability Details</h3>

              <Field label="Title" required error={errors.title}>
                <input
                  type="text"
                  placeholder="e.g. IDOR in laet4x.com user endpoint allows unauthorized modification"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputCls(errors.title)}
                  maxLength={200}
                />
              </Field>

              {/* Duplicate warning */}
              {duplicates.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2">
                  <p className="font-semibold">⚠️ Similar reports found in your submissions — check for duplicates before continuing:</p>
                  <ul className="space-y-1">
                    {duplicates.map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SEV_BADGE[d.severity] ?? SEV_BADGE.Info}`}>{d.severity}</span>
                        <span className="font-mono text-amber-700">{d.refId}</span>
                        <span className="truncate">{d.title}</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border`}>{d.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Field
                label="Description"
                required
                error={errors.description}
                hint="Describe the vulnerability, the affected endpoint/component, and what you observed."
              >
                <textarea
                  rows={5}
                  placeholder="The /api/user/{id}/edit endpoint does not verify that the authenticated user owns the resource…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={`${inputCls(errors.description)} resize-y`}
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
                  placeholder={"1. Log in as User A\n2. Note your resource ID…"}
                  value={form.stepsToReproduce}
                  onChange={(e) => set("stepsToReproduce", e.target.value)}
                  className={`${inputCls(errors.stepsToReproduce)} resize-y font-mono text-xs`}
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
                  placeholder="An attacker can modify or delete any user's data on laet4x.com…"
                  value={form.impact}
                  onChange={(e) => set("impact", e.target.value)}
                  className={`${inputCls(errors.impact)} resize-y`}
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={goBack} className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button type="button" onClick={goNext} className="flex-[3] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                Next Step →
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Review & Submit ───────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">📋 Review Your Report</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="w-28 flex-shrink-0 text-gray-500 font-medium">Target</dt>
                  <dd className="text-gray-900">{form.target}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 flex-shrink-0 text-gray-500 font-medium">Type</dt>
                  <dd className="text-gray-900">{form.vulnType}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 flex-shrink-0 text-gray-500 font-medium">Severity</dt>
                  <dd>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${SEV_BADGE[form.severity] ?? ""}`}>
                      {form.severity}
                    </span>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 flex-shrink-0 text-gray-500 font-medium">Title</dt>
                  <dd className="text-gray-900 font-medium">{form.title}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 flex-shrink-0 text-gray-500 font-medium">Description</dt>
                  <dd className="text-gray-700 line-clamp-3 whitespace-pre-line">{form.description}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-4 text-xs text-blue-600 hover:underline"
              >
                ← Edit classification
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-4 text-xs text-blue-600 hover:underline"
              >
                Edit details
              </button>
            </div>

            {/* Additional info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">
                📎 Additional Information{" "}
                <span className="text-gray-400 font-normal text-sm">(optional)</span>
              </h3>
              <Field label="CVSS Score" hint="e.g. CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N (Score: 8.1)">
                <input
                  type="text"
                  placeholder="e.g. 7.5 (High)"
                  value={form.cvss}
                  onChange={(e) => set("cvss", e.target.value)}
                  className={inputCls()}
                  maxLength={200}
                />
              </Field>
              <Field label="Supporting Evidence / Links" hint="PoC URLs, screenshots, screen recordings, Burp Suite exports, CVE references.">
                <textarea
                  rows={3}
                  placeholder={"https://drive.google.com/... (screenshot)\nhttps://asciinema.org/... (recording)"}
                  value={form.evidence}
                  onChange={(e) => set("evidence", e.target.value)}
                  className={`${inputCls()} resize-y`}
                />
              </Field>
            </div>

            {/* Disclosure agreement */}
            <div className={`rounded-xl border p-4 ${errors.agreed ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreed}
                  onChange={(e) => set("agreed", e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  I confirm I have read and agree to the{" "}
                  <Link href="/" className="text-blue-600 hover:underline font-medium">Responsible Disclosure Policy</Link>
                  . I have not exploited this vulnerability beyond what was necessary to confirm its existence, and I have not accessed, modified, or exfiltrated user data without authorisation.
                </span>
              </label>
              {errors.agreed && <p className="text-xs text-red-500 mt-2 ml-7" data-field-error>{errors.agreed}</p>}
            </div>

            {submitError && (
              <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <span className="text-lg leading-tight">⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={goBack} className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[3] py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
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
            </div>

            <p className="text-xs text-center text-gray-400 pb-4">
              By submitting you agree to our{" "}
              <Link href="/" className="hover:underline">Responsible Disclosure Policy</Link>.
              Reports are reviewed by our security team — no automated triage.
            </p>
          </form>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
