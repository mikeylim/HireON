-- Archive reason — why this job was archived
alter table jobs add column if not exists archive_reason text;
