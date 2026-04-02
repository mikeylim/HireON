-- Add structured tracking fields for interviews, offers, and rejections
-- These live on the jobs table since every job can eventually reach these stages

-- Interview details
alter table jobs add column if not exists interview_date timestamptz;
alter table jobs add column if not exists interview_type text; -- 'phone', 'video', 'onsite', 'technical', 'behavioral'
alter table jobs add column if not exists interview_location text;
alter table jobs add column if not exists interview_contact text; -- interviewer name/email
alter table jobs add column if not exists interview_prep text; -- prep notes, links, etc.

-- Offer details
alter table jobs add column if not exists offer_amount integer; -- annual salary offered
alter table jobs add column if not exists offer_date timestamptz;
alter table jobs add column if not exists offer_deadline timestamptz; -- deadline to respond

-- Rejection/archive details
alter table jobs add column if not exists rejected_date timestamptz;
alter table jobs add column if not exists rejection_reason text; -- e.g. "no response", "ghosted", "failed technical"
alter table jobs add column if not exists archived_date timestamptz;

-- Applied date tracking
alter table jobs add column if not exists applied_date timestamptz;

-- Index on interview date for sorting upcoming interviews
create index if not exists idx_jobs_interview_date on jobs (interview_date asc nulls last);
