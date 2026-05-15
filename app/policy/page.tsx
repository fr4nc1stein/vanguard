"use client";
import React from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function PolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <div className="bg-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-2">laet4x.com</p>
          <h1 className="text-4xl font-bold mb-4">Disclosure Policy</h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            This policy defines the rules of engagement, scope, and disclosure process for
            Vanguard VDP. All researchers must read and agree to this policy before
            submitting a report.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-12">
        <div className="space-y-10">

          {/* Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-blue-700 mb-4">Program Overview</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Vanguard VDP is our commitment to working collaboratively with the global
              security research community. We welcome good-faith reports of security
              vulnerabilities affecting <strong>laet4x.com</strong> and its associated
              infrastructure.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Valid reports receive acknowledgment within <strong>48 hours</strong> and a
              triage decision within <strong>7 business days</strong>. Researchers who
              identify and responsibly disclose qualifying vulnerabilities are eligible for
              public recognition on our{" "}
              <Link href="/hall-of-fame" className="text-blue-600 hover:underline">
                Hall of Fame
              </Link>
              .
            </p>
          </div>

          {/* Scope */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-blue-700 mb-6">Scope</h2>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">In Scope</h3>
              <div className="bg-blue-800 border border-blue-700 rounded-lg p-4">
                <ul className="space-y-2">
                  {["vanguard.laet4x.com", "laet4x.com"].map((target) => (
                    <li key={target} className="flex items-center gap-2 text-sm font-mono text-white">
                      <span className="text-green-400">✓</span>
                      {target}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Out of Scope</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-4">
                  The following will not be accepted as valid vulnerability reports:
                </p>
                <ul className="list-disc pl-5 text-gray-700 space-y-2 text-sm">
                  <li>Phishing, smishing, or social engineering attacks</li>
                  <li>Physical security issues</li>
                  <li>Denial of Service (DoS/DDoS) attacks or testing</li>
                  <li>Vulnerabilities in third-party services not under our control</li>
                  <li>UI/UX issues, typos, or cosmetic bugs without security impact</li>
                  <li>
                    Informational findings (e.g. banner disclosure, missing headers) with no
                    demonstrated exploitability
                  </li>
                  <li>
                    Best practice recommendations without a proof-of-concept demonstrating
                    real risk
                  </li>
                  <li>Self-XSS or attacks requiring physical device access</li>
                  <li>Rate limiting issues without demonstrated business impact</li>
                  <li>Theoretical vulnerabilities that cannot be reproduced</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What to Include */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-blue-700 mb-6">What to Include in a Report</h2>
            <p className="text-gray-700 mb-4">
              Incomplete reports may be closed without triage. High-quality submissions are
              reviewed faster. Please include:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>
                <strong>Vulnerability type</strong> — e.g. XSS, IDOR, SQL Injection, SSRF,
                authentication bypass
              </li>
              <li>
                <strong>Affected asset</strong> — URL, endpoint, parameter, or component
              </li>
              <li>
                <strong>Severity assessment</strong> — your estimated impact (Critical / High
                / Medium / Low)
              </li>
              <li>
                <strong>Steps to reproduce</strong> — clear, step-by-step instructions
              </li>
              <li>
                <strong>Proof of concept</strong> — screenshots, HTTP request/response logs,
                or PoC code
              </li>
              <li>
                <strong>Impact statement</strong> — what an attacker could achieve by
                exploiting this issue
              </li>
              <li>
                <strong>Suggested remediation</strong> (optional but appreciated)
              </li>
            </ul>
          </div>

          {/* Disclosure Process */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-blue-700 mb-6">Disclosure Process</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: "1",
                  title: "Submit",
                  desc: "Sign in and submit your report through the platform with full reproduction details.",
                },
                {
                  step: "2",
                  title: "Triage",
                  desc: "Our security team reviews, validates, and assigns a severity rating within 7 business days.",
                },
                {
                  step: "3",
                  title: "Remediation",
                  desc: "We develop and test a fix. We may request clarification or invite collaboration on the patch.",
                },
                {
                  step: "4",
                  title: "Resolution",
                  desc: "Once resolved, we close the report and update its status. Qualifying researchers are added to the Hall of Fame.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex flex-col">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                    {step}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Safe Harbor */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-blue-700 mb-6">
              Rules of Engagement & Safe Harbor
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Researcher Obligations</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2 text-sm">
                  <li>Only test against assets explicitly listed in scope</li>
                  <li>
                    Do not access, exfiltrate, modify, or destroy data belonging to others
                  </li>
                  <li>Do not disrupt production services or degrade availability</li>
                  <li>
                    Do not publicly disclose findings before we have had the opportunity to
                    remediate
                  </li>
                  <li>Act in good faith — no extortion, threats, or demands</li>
                  <li>Comply with all applicable laws throughout your research</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  Our Commitment to Researchers
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2 text-sm">
                  <li>
                    We will not pursue legal action against researchers who comply with this
                    policy
                  </li>
                  <li>We will respond to all valid reports within 48 hours of receipt</li>
                  <li>
                    We will keep you informed of triage and remediation progress
                  </li>
                  <li>
                    We will recognize qualifying researchers publicly in our Hall of Fame
                  </li>
                  <li>We will coordinate disclosure timing with you in good faith</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
