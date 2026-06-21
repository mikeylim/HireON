# HireON product direction

## Primary user

The primary user is an active Ontario/GTA job seeker managing dozens of opportunities alone. They need to answer three questions quickly:

1. Which jobs are worth applying to?
2. What should I do next today?
3. What is working in my search?

The portfolio guest is secondary. Guest mode should demonstrate the workflow clearly without implying that actions or data will persist.

## Current journey

1. Search four external sources or paste a posting found elsewhere.
2. Review normalized results and Gemini relevance scores.
3. Save selected jobs rather than polluting the tracker with every result.
4. Move a job through application stages and record application-specific details.
5. Use deadlines and follow-up reminders for daily action.
6. Review funnel and source analytics.

The preview-first search, editable AI extraction, contextual stage fields, and reminders are the strongest parts of the current product. They support decisions rather than automating judgment.

## Priorities

### P0: trust and data safety

- Change job URL uniqueness from global `url` to `(user_id, url)` so multiple users can save the same public posting safely.
- Protect URL auto-fill against server-side request forgery: resolve and reject private/loopback/link-local addresses, re-check redirects, limit response size, and allow only HTTP(S).
- Add runtime request validation and update-field allow-lists to every API route. The current add and update routes accept broad client objects.
- Rate-limit guest-accessible scraping and Gemini scoring to control abuse and API cost.
- Stop logging complete extracted model payloads in production; postings can contain contact details or pasted user content.

### P1: make the daily workflow reliable

- Make search honor `defaultLocation`; it is currently stored in settings but the scrape control always sends `Toronto, ON`.
- Persist settings per authenticated user so preferences follow them across browsers.
- Replace silent failures with visible retryable errors. Several mutation controls currently ignore non-2xx responses.
- Add a clear “Today” view combining deadlines, overdue follow-ups, interviews, and offer-response deadlines.
- Preserve explicit stage history rather than inferring the funnel only from the current row. A small `job_events` table would make transitions and analytics more trustworthy.
- Add expired/closed-posting checks and a quick archive action with a reason.

### P2: improve decisions after the foundation is sound

- Explain AI scores with matched and missing criteria, and allow manual score overrides or feedback.
- Track resume/cover-letter assets as reusable versions instead of free-text filenames.
- Add source-quality analytics: applications, interviews, and offers per source—not only job counts.
- Add optional email/calendar reminders for interviews, follow-ups, and deadlines.
- Improve first-run onboarding with a short profile setup and one guided search.

## Success measures

- Fewer saved jobs that pass their deadline without an action.
- More applications with a recorded resume version and follow-up decision.
- Time from finding a posting to saving a complete record.
- Interview and offer conversion by source and role family.
- Percentage of AI-filled records edited by the user, which is a useful quality signal rather than a failure.

## Deliberate boundaries

- Do not automate submitting applications.
- Do not add more scraper sources until reliability, validation, and rate limiting are in place.
- Do not optimize for large teams or recruiter workflows.
- Do not treat model scores as objective ranking truth; keep user review central.
