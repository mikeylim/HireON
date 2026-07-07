-- Reusable resume-version names for dropdown suggestions.
--
-- Historical application records remain on jobs.applied_resume_version. Deleting
-- a reusable version should remove it from future suggestions, not erase what
-- was recorded on past applications.
create table if not exists resume_versions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  normalized_name text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint resume_versions_name_not_blank check (length(btrim(name)) > 0),
  constraint resume_versions_normalized_name_not_blank check (length(btrim(normalized_name)) > 0)
);

create unique index if not exists idx_resume_versions_user_normalized_name
  on resume_versions (user_id, normalized_name);

create index if not exists idx_resume_versions_user_name
  on resume_versions (user_id, name);

drop trigger if exists resume_versions_updated_at on resume_versions;
create trigger resume_versions_updated_at
  before update on resume_versions
  for each row
  execute function update_updated_at();

alter table resume_versions enable row level security;

drop policy if exists "Users can select own resume versions" on resume_versions;
create policy "Users can select own resume versions"
  on resume_versions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resume versions" on resume_versions;
create policy "Users can insert own resume versions"
  on resume_versions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own resume versions" on resume_versions;
create policy "Users can update own resume versions"
  on resume_versions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resume versions" on resume_versions;
create policy "Users can delete own resume versions"
  on resume_versions for delete
  using (auth.uid() = user_id);

-- Seed the reusable list from any resume versions already recorded on jobs.
insert into resume_versions (user_id, name, normalized_name)
select distinct
  user_id,
  btrim(applied_resume_version) as name,
  lower(btrim(applied_resume_version)) as normalized_name
from jobs
where user_id is not null
  and nullif(btrim(applied_resume_version), '') is not null
on conflict (user_id, normalized_name) do nothing;
