# Changelog

All notable changes to the Vanguard VDP platform.

## [1.0.0] - 2026-05-07

### ✅ Authentication & Authorization
- Implemented Clerk v7 authentication with full redirect flow
- Configured sign-in page with `afterSignInUrl="/dashboard"`
- Configured sign-up page with proper redirect inheritance
- Set up root layout with `signInUrl`, `signUpUrl`, and `afterSignOutUrl`
- Protected routes via middleware: `/admin`, `/dashboard`, `/submit`
- Implemented role-based access control (USER, TRIAGER, ADMIN)
- Added role hierarchy enforcement in `lib/auth.ts`
- Created helper functions: `requireRole()`, `getSessionRole()`, `hasRole()`

### 🔒 Security
- Implemented AES-GCM-256 encryption for sensitive data
- Added Web Crypto API encryption/decryption in `lib/crypto.ts`
- Encrypted report body and email addresses before D1 storage
- Implemented SHA-256 IP hashing for privacy-preserving logging
- Added comprehensive audit logging for all report actions
- Validated all inputs with Zod v4 schemas

### 🎨 Frontend
- Built responsive navigation with mobile hamburger menu
- Created researcher dashboard with report list
- Implemented admin triage panel with filtering and search
- Added Hall of Fame with leaderboard and activity feed
- Designed report submission form with validation
- Created reusable components: SiteHeader, SiteFooter, ReportStatusBadge, AuditLogTimeline
- Implemented Tailwind CSS styling with consistent color scheme
- Added loading states, empty states, and error handling

### 🔌 Backend
- Created edge-compatible API routes for Cloudflare Workers
- Implemented report submission endpoint with encryption
- Built admin endpoints for triage and report management
- Added pagination and filtering to admin report list
- Created statistics endpoint for admin dashboard
- Integrated Discord webhook notifications for new reports
- Configured Drizzle ORM with D1 adapter

### 📊 Database
- Designed D1 schema with reports and audit_logs tables
- Created migration: `migrations/0001_schema.sql`
- Implemented encrypted field storage with IV columns
- Added foreign key relationships with CASCADE DELETE
- Configured indexes for performance

### 🚀 Infrastructure
- Set up Cloudflare Pages deployment
- Configured `@cloudflare/next-on-pages` build pipeline
- Added D1 database binding in `wrangler.toml`
- Created development scripts: `dev`, `dev:cf`, `deploy`
- Configured environment variables for production
- Set up edge runtime on all API routes

### 📚 Documentation
- Created comprehensive architecture blueprint (`docs/blueprint.md`)
- Wrote developer persona guide (`docs/agent.md`)
- Added detailed README with setup instructions
- Documented authentication flow and redirect chain
- Created codebase review document
- Added this changelog

### 🔧 Configuration
- Configured Next.js 16 with App Router
- Set up TypeScript strict mode
- Added `.npmrc` with `legacy-peer-deps=true`
- Configured `instrumentation.ts` for local dev platform
- Set up `middleware.ts` with Clerk protection
- Added `serverExternalPackages` to prevent bundling issues

## [0.1.0] - Initial Development

### Added
- Project scaffolding with Next.js 16
- Basic Cloudflare Pages setup
- Initial database schema design
- Clerk authentication integration (partial)
- Basic UI components

---

## Version History

- **1.0.0** (2026-05-07) - Production-ready release with full authentication, encryption, and admin features
- **0.1.0** - Initial development version
