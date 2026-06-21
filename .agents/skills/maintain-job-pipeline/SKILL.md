---
name: maintain-job-pipeline
description: Safely change HireON job statuses, application-tracking fields, status dates, or pipeline behavior across Supabase migrations, TypeScript types, API routes, lists, modals, timelines, analytics, and exports. Use for any task that adds, removes, renames, or changes the meaning of a job stage or tracking field; do not use for isolated visual styling.
---

# Maintain the job pipeline

## Trace the change

Before editing, locate the field or status in all of these surfaces:

1. `supabase/migrations/`
2. `src/lib/types/job.ts` and preview types when applicable
3. `/api/jobs/add`, `/api/jobs/save`, and `/api/jobs/update`
4. `JobList`, `JobDetailModal`, and `ApplicationTimeline`
5. Dashboard reminders/statistics and Analytics funnel calculations
6. CSV export and status-filtered pages

State which surfaces are intentionally unaffected.

## Preserve invariants

- Add a new numbered, idempotent migration; never rewrite an already-applied migration to represent a new production change.
- Keep `user_id` ownership and RLS intact.
- Treat day-only fields as local calendar dates. Use `todayLocal()` when setting them and `parseDate()` when displaying them.
- Treat `interview_date` as a timestamp when time-of-day matters.
- Allow-list API update fields and validate enum/date/value shapes.
- Preserve historical dates when a job advances unless the requested behavior explicitly resets history.
- Keep quick actions, bulk actions, modal status buttons, and contextual forms consistent.
- Recheck both current-status counts and historical funnel logic after a transition change.
- Account for the known global-URL uniqueness defect until a composite `(user_id, url)` migration fixes it.

## Verify

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Add or update focused tests for transition dates, backward transitions, bulk updates, timeline ordering, and analytics inclusion when the affected code becomes testable. Report any verification that cannot run because it requires live Supabase or paid external APIs.
