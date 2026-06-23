-- Manually tracked jobs may come from pasted text, referrals, or offline sources
-- where no stable public posting URL exists. PostgreSQL unique indexes allow
-- multiple NULL values, so the existing URL index still deduplicates linked jobs.
alter table jobs alter column url drop not null;
