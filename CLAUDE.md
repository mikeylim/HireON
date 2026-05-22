# HireON — Ontario/GTA Job Search Dashboard

## Project Overview
AI-powered job search dashboard for Ontario/GTA/Toronto. Scrapes postings from multiple open sources, uses Gemini for relevance scoring and structured extraction, and provides a full application-tracking pipeline. Deployed at `hireon-jobs.vercel.app`.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (class-based dark mode via `.dark` selector)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth (Google OAuth + email magic link)
- **AI:** Google Gemini API (gemini-3.5-flash)
- **Charts:** Recharts
- **Scraping:** Cheerio + Axios (server-side only)
- **Deployment:** Vercel

## Project Structure
```
src/
  app/
    (dashboard)/              # Protected dashboard routes
      dashboard/
        page.tsx              # Dashboard with stats, deadlines, follow-ups
        jobs/                 # Search & Scrape page (preview before saving)
        add/                  # Manual entry with AI auto-fill
        saved/applied/        # Status-filtered job lists
        interviews/offers/    # ↑
        archived/             # Rejected + archived combined
        analytics/            # Recharts visualizations
        settings/             # Default keywords, location, Gemini context
      layout.tsx              # Sidebar + topbar + GuestBanner shell
    api/
      jobs/
        check/                # POST { urls } → which URLs already exist
        save/                 # POST { jobs } → bulk insert with user_id
        update/               # PATCH single OR bulk via { id } or { ids }
        delete/               # DELETE { ids }
        add/                  # POST manual job entry
        parse-url/            # POST { url } OR { text } → AI extraction
      scrape/                 # POST { keywords, sources } → preview results
      score/                  # POST { jobs, userContext } → Gemini scores
    auth/callback/            # OAuth code exchange
    login/                    # Public login page
    robots.ts                 # SEO robots.txt
    sitemap.ts                # SEO sitemap.xml
    icon.png                  # Favicon
  components/
    jobs/                     # Job cards, modal, lists, scrape button, export
    layout/                   # Sidebar, topbar, theme + sidebar + preview context
  lib/
    supabase/
      client.ts               # Plain anon client (for non-auth queries)
      browser.ts              # Browser client with auth cookies
      server.ts               # Server client with auth cookies
      auth.ts                 # getAuthUser() helper for API routes
      middleware.ts           # Used by proxy.ts
    ats/                      # ATS platform adapters (Phase 2/3)
      types.ts                # Shared AtsAdapter interface
      index.ts                # Registry + tryAdapters() helper
      workday.ts              # Direct Workday CXS API
      greenhouse.ts           # Greenhouse Boards API
      lever.ts                # Lever Postings API
      ashby.ts                # Ashby posting-api
      jsonld.ts               # Universal schema.org JobPosting parser
    gemini/
      score.ts                # Relevance scoring (0-100 with reason)
      parse-url.ts            # Structured extraction with strict JSON schema
    scraper/
      jobbank.ts adzuna.ts jooble.ts remotive.ts
    settings.ts               # localStorage settings (defaults for scraping)
    types/                    # TypeScript types
  proxy.ts                    # Next.js 16 proxy (auth gate + RLS cookie refresh)
supabase/migrations/          # SQL migrations (numbered, idempotent)
docs/                         # Screenshots for README
```

## Code Conventions
- TypeScript strict mode
- Server components by default; add `"use client"` only when needed
- Three Supabase client variants — pick the right one:
  - `lib/supabase/client.ts` — plain anon client (rarely used now)
  - `lib/supabase/browser.ts` — browser client with auth cookies (use in `"use client"` components)
  - `lib/supabase/server.ts` — server client with auth cookies (use in API routes)
- Environment variables: `NEXT_PUBLIC_` prefix for client, plain for server
- API routes: check auth with `getAuthUser()`, return 401 if no user (except `/api/scrape` and `/api/score` which allow guests)
- All SQL migrations must be idempotent (`if not exists`, `do $$ ... $$` for enums, `drop ... if exists` for triggers/policies)
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Never write "Claude wrote this" anywhere in commits or code
- Comments: natural-sounding, only when the "why" isn't obvious

## Key Patterns

### Preview-first scraping
Scraping returns results to the client without saving. User reviews + Gemini scores → user selects → save endpoint writes to DB. Prevents pipeline pollution.

### ATS Adapter Pattern (Phase 2/3)
For AI auto-fill on Add Job page. We try adapters in order, falling back gracefully:
1. **Platform-specific adapters** (Workday, Greenhouse, Lever, Ashby) hit the official JSON APIs of major ATS systems. No scraping, no Gemini — just direct structured data.
2. **JSON-LD universal adapter** parses schema.org JobPosting markup that Google Jobs requires. Works on Phenom (BMO), most modern career sites.
3. **Cheerio + Gemini fallback** for sites that have neither.
4. **"From Pasted Text" mode** as a manual fallback the user can always trigger.

### Anti-hallucination guardrails in Gemini parsing
- Strict JSON schema in the prompt
- Low temperature (0.05)
- Explicit "return null if uncertain" instruction
- `responseMimeType: "application/json"` enforced
- `thinkingConfig: { thinkingBudget: 0 }` disables internal reasoning for parse-url (it's pure extraction, not reasoning)
- AI badges on auto-filled form fields — disappear when user edits

### Auth + RLS
- Proxy middleware at `src/proxy.ts` (Next.js 16 uses "proxy" not "middleware")
- Cookies carry the session — server and browser clients both read them
- RLS policies on `jobs` table enforce `auth.uid() = user_id`
- Guest mode uses a `hireon-guest=true` cookie that the proxy honors

### Job Status Flow
new → saved → applied → interview → offer/rejected/archived

Auto-set dates on status transitions: applied_date, interview_date, offer_date, rejected_date, archived_date.

### Filters and sorting
All filtering/sorting happens via Supabase queries, not client-side. Pagination uses `.range(from, to)`.

### Themed UI
- CSS variables in `globals.css` for both light and dark modes
- `.dark` class on `<html>` toggles them (set by ThemeProvider)
- Tailwind v4: requires `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css` since v4 defaults to `prefers-color-scheme`
- Theme-aware logo: two PNGs, swap with `block dark:hidden` / `hidden dark:block`

## Environment Variables
Required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `ADZUNA_APP_ID` + `ADZUNA_API_KEY`
- `JOOBLE_API_KEY`

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build (run after major changes to verify)
- `npm run lint` — ESLint check

## Migration Workflow
1. Add new file `supabase/migrations/00X_description.sql`
2. **Must be idempotent** — wrap enums in `do $$ ... $$`, use `if not exists` everywhere
3. Run manually in Supabase SQL Editor for prod, also gets validated by Supabase preview CI on push

## Known Quirks
- Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (export named `proxy`, not `middleware`)
- Tailwind v4 needs `@custom-variant dark` for class-based dark mode
- Gemini "thinking" models use output tokens for internal reasoning — disable with `thinkingConfig: { thinkingBudget: 0 }` for non-reasoning tasks
- BMO/Phenom-style sites don't have public JSON APIs but DO have JSON-LD — the universal JSON-LD adapter handles them
- LinkedIn/Indeed/Glassdoor are explicitly blocked and shown a clear warning — no point fighting their anti-bot detection
