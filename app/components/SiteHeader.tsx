"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useAuth, useUser } from "@clerk/nextjs";

const PUBLIC_NAV = [
  { href: "/hall-of-fame", label: "Hall of Fame" },
];

function GitHubStarButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/fr4nc1stein/vanguard')
      .then(res => res.json())
      .then(data => setStars(data.stargazers_count))
      .catch(() => setStars(null));
  }, []);

  return (
    <a
      href="https://github.com/fr4nc1stein/vanguard"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
      title="Star on GitHub"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <span className="hidden lg:inline">Star</span>
      {stars !== null && (
        <span className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
          <GitHubStarButton />
          
          {stars.toLocaleString()}
        </span>
      )}
    </a>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
          <img
            src="/transparent-logo.png"
            alt="Vanguard VDP"
            className="h-8 w-auto"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-blue-700 leading-tight">Vanguard VDP</p>
            <p className="text-xs text-gray-500 leading-tight">Vulnerability Disclosure Program</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {PUBLIC_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === link.href
                  ? "text-blue-700 bg-blue-50"
                  : "text-gray-600 hover:text-blue-700 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {isSignedIn && (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard")
                    ? "text-blue-700 bg-blue-50"
                    : "text-gray-600 hover:text-blue-700 hover:bg-gray-50"
                }`}
              >
                My Reports
              </Link>

              {(role === "TRIAGER" || role === "ADMIN") && (
                <Link
                  href="/triage"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname.startsWith("/triage")
                      ? "text-purple-700 bg-purple-50"
                      : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  🛡️ Triage
                </Link>
              )}
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-orange-700 bg-orange-50"
                      : "text-gray-600 hover:text-orange-700 hover:bg-orange-50"
                  }`}
                >
                  ⚙️ Admin
                </Link>
              )}
            </>
          )}

          <Link
            href="/submit"
            className="ml-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            🐛 Submit
          </Link>

          <div className="ml-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <a
            href="https://github.com/fr4nc1stein/vanguard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border-b border-gray-100 mb-2"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Star on GitHub
            </span>
          </a>
          
          {PUBLIC_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === link.href ? "text-blue-700 bg-blue-50" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50"
              >
                My Reports
              </Link>
              {(role === "TRIAGER" || role === "ADMIN") && (
                <Link
                  href="/triage"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-purple-50"
                >
                  🛡️ Triage
                </Link>
              )}
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-orange-50"
                >
                  ⚙️ Admin
                </Link>
              )}
            </>
          )}
          <Link
            href="/submit"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white"
          >
            🐛 Submit Report
          </Link>
          <div className="pt-2 border-t border-gray-100">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
