"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";


const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Discover",
    desc: "Identify a security vulnerability across our in-scope assets. Test responsibly and document your findings with clear reproduction steps.",
  },
  {
    step: "02",
    title: "Report",
    desc: "Sign in and submit your report through the platform. All submissions are end-to-end encrypted. No email required.",
  },
  {
    step: "03",
    title: "Get Recognized",
    desc: "Our team triages your report, keeps you informed of progress, and adds qualifying researchers to the public Hall of Fame.",
  },
];

interface Scope {
  id: string;
  domain: string;
  description: string | null;
  targetType: string;
  status: string;
}

export default function Home() {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScopes() {
      try {
        const res = await fetch('/api/scopes');
        if (res.ok) {
          const data = await res.json();
          setScopes(data.scopes || []);
        }
      } catch (err) {
        console.error('Failed to fetch scopes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchScopes();
  }, []);

  const activeScopes = scopes.filter(s => s.status === 'active');
  const scopeCount = activeScopes.length || 2;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 border-b border-white/10">
        {/* grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-28 md:py-36">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold tracking-widest uppercase">
            Vulnerability Disclosure Program
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6 text-white">
            Find it first.<br />
            <span className="text-blue-400">Report it right.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed">
            Vanguard VDP is a structured vulnerability disclosure program for{" "}
            <span className="text-white font-medium">laet4x.com</span>. Security researchers
            who identify and responsibly disclose valid vulnerabilities are recognized on our
            public Hall of Fame.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/submit"
              className="px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-base shadow-lg shadow-blue-900/40"
            >
              Submit a Report →
            </Link>
            <Link
              href="/hall-of-fame"
              className="px-7 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors text-base"
            >
              Hall of Fame
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-gray-900 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-blue-400 mb-1">{scopeCount}</p>
            <p className="text-sm text-gray-400">In-Scope Targets</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-blue-400 mb-1">AES-256</p>
            <p className="text-sm text-gray-400">Encrypted Submissions</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-blue-400 mb-1">48h</p>
            <p className="text-sm text-gray-400">Acknowledgment SLA</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-blue-400 mb-1">7 days</p>
            <p className="text-sm text-gray-400">Triage SLA</p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-gray-950 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-white mb-2">How it works</h2>
          <p className="text-gray-400 mb-12">Three steps from discovery to recognition.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div
                key={step}
                className="bg-gray-900 rounded-2xl border border-white/10 p-8 hover:border-blue-500/40 transition-colors"
              >
                <p className="text-5xl font-black text-blue-600/30 mb-4 leading-none">{step}</p>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── In-scope assets ── */}
      <section className="bg-gray-900 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3">In-scope assets</h2>
            <p className="text-gray-400 leading-relaxed">
              Only assets listed below are eligible for this program. Testing against
              out-of-scope targets may violate our rules of engagement. Read the full{" "}
              <Link href="/policy" className="text-blue-400 hover:underline">
                Disclosure Policy
              </Link>{" "}
              before starting.
            </p>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading scopes...</div>
            ) : activeScopes.length > 0 ? (
              activeScopes.map((scope) => (
                <div
                  key={scope.id}
                  className="flex items-center gap-3 bg-gray-950 border border-white/10 rounded-xl px-5 py-4"
                >
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" />
                  <span className="font-mono text-white text-sm">{scope.domain}</span>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-800 rounded-md px-2 py-0.5">
                    In scope
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No active scopes available</div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-blue-950 via-gray-950 to-gray-950 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Ready to contribute?
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Sign in, submit a vulnerability, and join the researchers recognized on our Hall of Fame.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/submit"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-base shadow-lg shadow-blue-900/40"
            >
              Submit a Report
            </Link>
            <Link
              href="/policy"
              className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors text-base"
            >
              Read the Policy
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
