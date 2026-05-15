"use client";
import React from "react";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <SiteHeader />

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Reporting Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600 border-b pb-4">
              Reporting Vulnerabilities
            </h2>
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-gray-700">
                  If you discover a security vulnerability in Vanguard VDP, please report it responsibly by emailing{" "}
                  <a href="mailto:security@vanguardvdp.ph" className="text-blue-600 hover:text-blue-800 font-medium">
                    security@vanguardvdp.ph
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-blue-700 mb-3">What to Include in Your Report</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>A clear description of the vulnerability</li>
                  <li>Steps to reproduce the issue</li>
                  <li>Potential impact and severity</li>
                  <li>Any relevant screenshots or proof-of-concept code (if applicable)</li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <h3 className="font-semibold text-green-700 mb-2">Our Commitment</h3>
                <p className="text-gray-700">
                  We will acknowledge your report within 48 hours and provide a detailed response within 7 days, outlining our next steps.
                </p>
              </div>
            </div>
          </section>

          {/* Scope Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600 border-b pb-4">
              Scope
            </h2>
            <p className="text-gray-700 mb-6">
              This security policy applies to the Vanguard VDP website, its associated services, and any related infrastructure.
            </p>

            <h3 className="font-semibold text-blue-700 mb-4">Out of Scope</h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">The following issues are considered out of scope for security reports:</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-2">
                <li>Scam &amp; phishing attempts involving Vanguard VDP services</li>
                <li>Physical security vulnerabilities</li>
                <li>Social engineering attacks</li>
                <li>Functional, UI, and UX bugs including:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Spelling mistakes</li>
                    <li>Formatting issues</li>
                    <li>Visual design inconsistencies</li>
                  </ul>
                </li>
                <li>Descriptive error messages</li>
                <li>HTTP error codes/pages</li>
                <li>Missing security headers without practical security impact</li>
                <li>Best practice recommendations without security impact</li>
                <li>Version disclosure without vulnerabilities</li>
                <li>Theoretical vulnerabilities without proof of exploitation</li>
              </ul>
            </div>
          </section>

          {/* Process Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600 border-b pb-4">
              Disclosure Process
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold text-blue-700 mb-4">1. Initial Report</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Submit your vulnerability report via email</li>
                  <li>Include all necessary details and proof of concept</li>
                  <li>Our team will confirm receipt of your report</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-blue-700 mb-4">2. Review and Validation</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Our security team reviews the reported issue</li>
                  <li>We may ask for additional information or clarification</li>
                  <li>Valid reports will be confirmed and prioritized</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-blue-700 mb-4">3. Fix Development</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Work on a fix via pull request</li>
                  <li>Invite you to collaborate if you're interested</li>
                  <li>Test the fix thoroughly</li>
                  <li>Coordinate the release timeline</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Guidelines Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600 border-b pb-4">
              Guidelines & Safe Harbor
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-blue-700 mb-4">Disclosure Guidelines</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Do not disclose to others while under investigation</li>
                  <li>Do not exploit the vulnerability for any purpose</li>
                  <li>Do not access, modify, or delete data</li>
                  <li>Provide reasonable time for resolution</li>
                  <li>Follow responsible disclosure practices</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-blue-700 mb-4">Legal Safe Harbor</h3>
                <p className="text-gray-700 mb-4">We will not take legal action against you if you:</p>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Follow our disclosure guidelines</li>
                  <li>Do not compromise user data</li>
                  <li>Do not exploit vulnerabilities for malicious purposes</li>
                  <li>Report vulnerabilities promptly and responsibly</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
