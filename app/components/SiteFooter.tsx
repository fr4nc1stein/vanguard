import React from "react";

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-sm text-gray-300">Vanguard VDP — Vulnerability Disclosure Program</p>
            <p className="text-xs mt-1">© {new Date().getFullYear()} Vanguard VDP. All content is public domain unless otherwise specified.</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a
              href="mailto:security@vanguardvdp.ph"
              className="hover:text-white transition-colors"
            >
              security@vanguardvdp.ph
            </a>
            <a
              href="https://github.com/vanguardvdp/"
              className="hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://vanguardvdp.ph"
              className="hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              vanguardvdp.ph
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
