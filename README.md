# HireON

Job search dashboard for Ontario/GTA/Toronto. Scrapes postings from multiple free sources, scores them with Gemini AI for relevance, and lets you track your entire application pipeline in one place.

## Features

- **Multi-source scraping** — Job Bank Canada, Adzuna, Jooble, Remotive
- **AI relevance scoring** — Gemini rates each job 0–100 based on your profile
- **Preview before saving** — review and cherry-pick jobs before they hit your database
- **Manual job entry** — add jobs from Indeed, Glassdoor, university portals, etc.
- **Application tracking** — Saved → Applied → Interview → Offer/Rejected/Archived
- **Collapsible sidebar** — clean dashboard with stat cards and quick navigation

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + Lucide icons
- Supabase (PostgreSQL)
- Google Gemini API
- Cheerio + Axios for scraping

## Setup

```bash
git clone https://github.com/<your-username>/hireon.git
cd hireon
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
```

Run the Supabase migration in `supabase/migrations/001_create_jobs_table.sql` via the SQL Editor in your Supabase dashboard.

```bash
npm run dev
```

## Roadmap

- [ ] Job detail view with status management
- [ ] Filters and sorting on all pages
- [ ] CSV/JSON export
- [ ] n8n integration (Google Sheets + WhatsApp notifications)
- [ ] Auth + resume upload for personalized scoring
- [ ] Vercel deployment
