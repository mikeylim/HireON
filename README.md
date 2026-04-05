# HireON

Job search dashboard for Ontario/GTA/Toronto. Scrapes postings from multiple free sources, scores them with Gemini AI for relevance, and lets you track your entire application pipeline in one place.

## Features

**Search & Scrape**
- Multi-source scraping — Job Bank Canada, Adzuna, Jooble, Remotive
- AI relevance scoring — Gemini rates each job 0-100 based on your profile
- Preview before saving — review, score, and cherry-pick jobs before they hit your database
- Cross-source deduplication — same job from different sources is detected and merged
- Already-saved detection — previously saved jobs are grayed out in preview

**Job Tracking**
- Full pipeline: Saved → Applied → Interview → Offer → Rejected/Archived
- Job detail modal with status transitions, notes, and edit mode
- Quick status buttons on cards (one-click "Applied", "Archive", etc.)
- Contextual fields per status: application method, interview details, offer salary, rejection/archive reasons

**Dashboard**
- Stat cards: Total Jobs, New Today, Saved, Applied, Interviews, Offers
- Application stats: applied this week, applied this month, interview rate
- Deadline alerts for jobs expiring in the next 7 days
- Follow-up reminders for jobs needing a response
- Global search across all jobs from the topbar

**More**
- Manual job entry with duration and salary period options
- CSV export on all pages with page-specific filenames
- Light/dark/system theme toggle
- Collapsible sidebar
- Settings page for default keywords, location, sources, and AI scoring context

**Auth & Security**
- Google OAuth and email magic link login
- Row Level Security — each user only sees their own jobs
- All API routes are auth-protected
- Deployed on Vercel

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + Lucide icons
- Supabase (PostgreSQL + Auth + RLS)
- Google Gemini API
- Cheerio + Axios for scraping
- Vercel for deployment

## Setup

```bash
git clone https://github.com/mikeylim/HireON.git
cd HireON
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
```

Run all migrations in order from `supabase/migrations/` via the SQL Editor in your Supabase dashboard.

Configure auth in Supabase: enable Google provider, set Site URL and redirect URLs.

```bash
npm run dev
```

## Roadmap

- [ ] Resume upload for personalized AI scoring
- [ ] n8n integration (Google Sheets + WhatsApp notifications)
- [ ] Automated daily scraping
