-- HireON: Core jobs table
-- Stores every scraped job posting along with its tracking status and LLM scores

-- Custom enum types for structured fields
create type job_status as enum (
  'new', 'saved', 'applied', 'interview', 'offer', 'rejected', 'archived'
);

create type job_type as enum (
  'full-time', 'part-time', 'contract', 'internship', 'temporary'
);

create type work_mode as enum (
  'onsite', 'remote', 'hybrid'
);

create table jobs (
  id            uuid primary key default gen_random_uuid(),

  -- Core job info from scraping
  title         text not null,
  company       text not null,
  location      text not null default 'Toronto, ON',
  work_mode     work_mode default 'onsite',
  job_type      job_type default 'full-time',
  salary_min    integer,           -- annual, in CAD
  salary_max    integer,
  description   text not null default '',
  url           text not null,     -- link to the original posting
  source        text not null,     -- e.g. 'indeed', 'jobbank', 'linkedin'

  -- Tracking & user interaction
  status        job_status not null default 'new',
  notes         text not null default '',

  -- Gemini LLM scoring (0-100, null = not yet scored)
  relevance_score integer,
  tags          text[] not null default '{}',

  -- Dates
  posted_at     timestamptz,       -- when the job was originally posted
  deadline      timestamptz,       -- application deadline if available
  scraped_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Speed up common queries: filtering by status, sorting by date/relevance
create index idx_jobs_status on jobs (status);
create index idx_jobs_relevance on jobs (relevance_score desc nulls last);
create index idx_jobs_posted_at on jobs (posted_at desc nulls last);
create index idx_jobs_source on jobs (source);

-- Avoid importing the same job twice from the same source
create unique index idx_jobs_url on jobs (url);

-- Auto-update the updated_at timestamp on row changes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on jobs
  for each row
  execute function update_updated_at();
