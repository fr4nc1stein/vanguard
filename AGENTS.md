# Vanguard VDP Agent Instructions

This file gives Codex and other repo-aware coding agents the default working rules for this repository.

Inspired by the MIT-licensed Karpathy Guidelines skill:
https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md

## Think Before Coding

- Read the relevant code and docs before editing.
- State assumptions when the request is ambiguous.
- Ask only when a reasonable assumption would be risky.
- Surface tradeoffs when there are multiple valid approaches.
- Prefer a simpler fix when it satisfies the requested behavior.

## Keep Changes Small

- Touch only the files needed for the task.
- Do not refactor adjacent code just because it looks imperfect.
- Match the existing style, naming, and module boundaries.
- Remove unused imports, variables, and helpers introduced by your own change.
- Leave pre-existing dead code alone unless the user asks for cleanup.

## Define Success Criteria

- Turn each task into a verifiable result before implementing.
- For bug fixes, prefer a reproducing test when practical.
- For refactors, preserve behavior and run the relevant checks before and after when feasible.
- For security changes, verify the exact observable behavior, not just compilation.

## Vanguard-Specific Rules

- Read `docs/blueprint.md` before broad architecture or data-model changes.
- Use `npm run dev:cf` for anything that depends on Cloudflare D1 bindings.
- Plain `npm run dev` is only for fast UI work that does not need D1.
- Do not add `export const runtime = 'edge'`; this app already runs on the Cloudflare/OpenNext edge path.
- API routes must perform their own auth with the existing helpers, usually `requireRole()`.
- Keep PII out of logs, audit responses, and public-facing data.
- Do not commit one-off migration files that contain user-specific data.
- Do not modify or delete untracked `test-results/` unless explicitly asked.

## Validation

- Run `npm test` for logic changes.
- Run `npm run build` for production-impacting changes.
- Run `git diff --check` before handing work back.
- `npm run lint` currently has unrelated existing failures; report that clearly if it fails.

## Git Hygiene

- Start feature or fix work from an up-to-date `main` unless the user says otherwise.
- Use focused branch names tied to the issue or task.
- Commit only the files relevant to the current request.
- Never revert user changes or unrelated work without explicit permission.
