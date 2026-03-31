# HireON — Ontario/GTA Job Search Dashboard

## Project Overview
Personal job search dashboard for Ontario/GTA/Toronto. Scrapes job postings from multiple sources, uses Gemini LLM for relevance scoring/filtering, and provides a tracking dashboard with apply/save/archive workflows. Integrates with n8n for Google Sheets sync and WhatsApp notifications.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL, free tier)
- **Auth:** Supabase Auth (future phase)
- **Scraping:** Cheerio + Axios (server-side)
- **LLM:** Google Gemini API (relevance scoring, smart filtering)
- **Automation:** n8n (Google Sheets, WhatsApp, cron scraping)
- **Deployment:** Vercel (free tier)

## Project Structure
```
src/
  app/              # Next.js App Router pages + API routes
    (dashboard)/    # Dashboard layout group
    api/            # API route handlers
  components/       # React components
    ui/             # shadcn/ui components
    jobs/           # Job-related components
    layout/         # Sidebar, topbar, etc.
  lib/              # Utilities and shared logic
    supabase/       # Supabase client + queries
    scraper/        # Scraping logic per source
    gemini/         # Gemini API integration
    types/          # TypeScript types/interfaces
  hooks/            # Custom React hooks
```

## Code Conventions
- Use TypeScript strict mode
- Use server components by default; add "use client" only when needed
- Use Supabase client via `createClient()` helpers (server vs browser)
- Environment variables prefixed: `NEXT_PUBLIC_` for client, plain for server
- API routes return consistent shape: `{ data, error, message }`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Key Patterns
- **Scraping:** Each job source has its own scraper module in `lib/scraper/`
- **LLM Processing:** Gemini scores jobs 0-100 for relevance, adds tags, flags duplicates
- **Job Status Flow:** new → saved → applied → interview → offer/rejected/archived
- **Filters:** All filtering/sorting happens via Supabase queries, not client-side

## Environment Variables (required)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `GEMINI_API_KEY` — Google Gemini API key

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
