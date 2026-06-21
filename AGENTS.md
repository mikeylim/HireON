# HireON repository guide

## Product intent

HireON is a personal Ontario/GTA job-search workspace. It helps a job seeker find relevant postings, decide which ones deserve attention, and keep applications moving through saved, applied, interview, offer, rejected, and archived states.

Optimize for the signed-in job seeker first and the portfolio guest second. Prefer changes that reduce missed deadlines, repeated data entry, and uncertainty about the next action. Do not turn the app into a generic job board or an automated application bot.

## Current stack

- Next.js 16 App Router, React 19, and strict TypeScript 6
- Tailwind CSS 4 with class-based dark mode
- Supabase Auth and PostgreSQL with row-level security
- Gemini REST API for relevance scoring and structured extraction
- Axios, Cheerio, and `fast-xml-parser` for server-side ingestion
- Recharts for client-side analytics
- npm and Vercel

Use `package.json` and the implementation as the source of truth for versions. `README.md` is public-facing; this file is the canonical engineering guide.

## Architecture

- `src/app/(dashboard)/dashboard/`: dashboard, search preview, manual entry, pipeline pages, analytics, and settings.
- `src/app/api/`: route handlers. Job mutations authenticate at the route and rely on RLS as defense in depth.
- `src/components/jobs/`: reusable job lists, details, timeline, scraping controls, and export.
- `src/components/layout/`: shell, navigation, theme, guest messaging, and page identity.
- `src/lib/ats/`: ordered ATS adapters. Platform APIs run first; JSON-LD is the universal adapter.
- `src/lib/scraper/`: Job Bank, Adzuna, Jooble, and Remotive ingestion.
- `src/lib/gemini/`: scoring and structured extraction.
- `src/lib/supabase/`: browser/server clients, auth helper, and proxy session refresh.
- `supabase/migrations/`: the database history. Migrations are applied manually in order.
- `docs/PRODUCT.md`: user-centered product direction and prioritized risks.

## Core workflows

### Search and save

`/api/scrape` gathers results without persisting them. The All Jobs page deduplicates, checks existing URLs, scores results, lets the user select jobs, then calls `/api/jobs/save`. Preserve this preview-first boundary.

### Manual entry and AI extraction

`/api/jobs/parse-url` tries Workday, Greenhouse, Lever, Ashby, and JSON-LD before falling back to Cheerio plus Gemini. Pasted text is the reliable fallback for blocked or client-rendered sites. Extracted fields are suggestions and must remain editable.

### Application tracking

The status flow is `new -> saved -> applied -> interview -> offer`, with `rejected` and `archived` terminal-like states. Status dates are calendar dates except `interview_date`, which may contain a meaningful time. Use `todayLocal()` and `parseDate()` instead of UTC shortcuts for calendar fields.

### Authentication and guest mode

`src/proxy.ts` refreshes Supabase sessions and gates page routes. The guest cookie permits the dashboard shell and the unauthenticated scrape/score APIs, but RLS returns no personal jobs and mutation routes reject guests. Do not describe guest mode as having persistent sample data unless that is implemented.

## Engineering rules

- Prefer server components. Add `"use client"` only for state, effects, browser APIs, or event handlers.
- Use `createBrowserSupabase()` in client components and `createServerSupabase()` in route handlers/server code.
- Authenticate every database mutation with `getAuthUser()` and retain RLS ownership checks.
- Validate request bodies and allow-list mutable columns at API boundaries. Never pass arbitrary client objects directly into database updates in new code.
- Treat scraped HTML, ATS responses, URLs, and model output as untrusted input. Any user-controlled outbound URL must reject private, loopback, link-local, and non-HTTP(S) destinations before fetching.
- Keep API keys server-only. Only the Supabase URL and anonymous key may use `NEXT_PUBLIC_`.
- Keep migrations numbered and idempotent. Use `if not exists`; recreate policies/triggers safely when PostgreSQL lacks that form.
- Keep database, `Job` types, API payloads, modal state, timeline behavior, analytics, and exports aligned when tracking fields change. Use the `maintain-job-pipeline` skill for these changes.
- Preserve RLS behavior in every query. Do not work around ownership failures with a service-role client.
- Use `cn()` for conditional class composition where it improves readability. Tailwind class strings must remain statically discoverable.
- Comments should explain non-obvious constraints, especially date handling, auth, third-party parsing, and fallback behavior.
- Do not add production dependencies without a concrete need. This is a personal project; prefer small, direct implementations.
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, and `chore:`. Do not add AI attribution to commits or source files.

## Database caveat

Migration `001` currently makes `jobs.url` globally unique, while migration `005` adds per-user ownership. This prevents two users from independently saving the same posting and can make URL upserts conflict across RLS boundaries. Treat composite uniqueness on `(user_id, url)` as a known defect, not an intentional invariant.

## Commands and verification

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

- Run `npm run lint` and `npm run typecheck` after TypeScript or React changes.
- Run `npm run build` after routing, configuration, dependency, or broad UI changes.
- There is no automated test suite yet. Add focused tests when changing parsers, date helpers, status transitions, validation, or deduplication; these are high-regression areas.
- Do not call live paid APIs merely to validate a local refactor. Mock or isolate external boundaries when adding tests.

## Review guidelines

- Prioritize auth/RLS regressions, cross-user data access, unsafe outbound URL fetching, exposed secrets, and destructive bulk actions.
- Check calendar dates for Toronto timezone regressions.
- Check that loading, empty, failure, and guest states remain understandable on mobile and desktop.
- Verify database changes against all reads, writes, analytics, CSV export, and TypeScript types.
- Flag UI actions that report success without checking `response.ok` or the returned error.

## Environment

Copy `.env.example` to `.env.local`. Required keys are Supabase URL/anon key, Gemini API key, Adzuna app ID/key, and Jooble API key. Never print, commit, or copy values from `.env.local` into docs or examples.
