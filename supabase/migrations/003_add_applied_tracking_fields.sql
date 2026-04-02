-- Applied tracking: how and where the application was submitted
alter table jobs add column if not exists applied_method text; -- 'company_website', 'email', 'linkedin_easy_apply', 'referral', 'job_portal', 'in_person', 'other'
alter table jobs add column if not exists applied_resume_version text; -- which resume version was used
alter table jobs add column if not exists applied_cover_letter boolean default false;
alter table jobs add column if not exists applied_referral text; -- referral contact name if applicable
alter table jobs add column if not exists applied_follow_up_date timestamptz; -- when to follow up
