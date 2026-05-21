-- HireON: Core jobs table
-- Stores every scraped job posting along with its tracking status and LLM scores

-- Custom enum types — wrapped in DO blocks since Postgres doesn't support
-- "create type if not exists". The DO block checks pg_type first.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum (
      'new', 'saved', 'applied', 'interview', 'offer', 'rejected', 'archived'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type job_type as enum (
      'full-time', 'part-time', 'contract', 'internship', 'temporary'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'work_mode') then
    create type work_mode as enum ('onsite', 'remote', 'hybrid');
  end if;
end$$;

-- Tables support "if not exists" natively
create table if not exists jobs (
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

-- Indexes also support "if not exists"
create index if not exists idx_jobs_status on jobs (status);
create index if not exists idx_jobs_relevance on jobs (relevance_score desc nulls last);
create index if not exists idx_jobs_posted_at on jobs (posted_at desc nulls last);
create index if not exists idx_jobs_source on jobs (source);
create unique index if not exists idx_jobs_url on jobs (url);

-- Functions are safe to "create or replace"
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers don't have "if not exists" — drop first, then create
drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at
  before update on jobs
  for each row
  execute function update_updated_at();
