-- Add user_id column to tie jobs to authenticated users
alter table jobs add column if not exists user_id uuid references auth.users(id);

-- Backfill existing jobs: if you already have jobs in the DB, they'll have null user_id.
-- After you log in for the first time, run this manually in SQL Editor
-- replacing YOUR_USER_ID with your actual auth user ID:
-- UPDATE jobs SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- Enable Row Level Security
alter table jobs enable row level security;

-- Users can only see their own jobs
create policy "Users can view their own jobs"
  on jobs for select
  using (auth.uid() = user_id);

-- Users can only insert jobs for themselves
create policy "Users can insert their own jobs"
  on jobs for insert
  with check (auth.uid() = user_id);

-- Users can only update their own jobs
create policy "Users can update their own jobs"
  on jobs for update
  using (auth.uid() = user_id);

-- Users can only delete their own jobs
create policy "Users can delete their own jobs"
  on jobs for delete
  using (auth.uid() = user_id);
