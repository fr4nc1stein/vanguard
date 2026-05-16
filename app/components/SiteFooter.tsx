import React from "react";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-200 mb-1">Vanguard VDP</p>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              A structured vulnerability disclosure program for laet4x.com. Find it first. Report it right.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Program</p>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/policy" className="hover:text-white transition-colors">Disclosure Policy</Link></li>
                <li><Link href="/hall-of-fame" className="hover:text-white transition-colors">Hall of Fame</Link></li>
                <li><Link href="/submit" className="hover:text-white transition-colors">Submit a Report</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Account</p>
              <ul className="space-y-2">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">My Reports</Link></li>
                <li><Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/sign-up" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Vanguard VDP. All rights reserved.</p>
          <p>laet4x.com — Powered by Cloudflare Workers</p>
        </div>
      </div>
    </footer>
  );
}
