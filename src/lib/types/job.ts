export type JobStatus =
  | "new"
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "temporary";

export type WorkMode = "onsite" | "remote" | "hybrid";

export interface Job {
  id: string;
  user_id: string | null;
  title: string;
  company: string;
  location: string;
  work_mode: WorkMode;
  job_type: JobType;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  source: string;
  status: JobStatus;
  relevance_score: number | null;
  tags: string[];
  notes: string;
  posted_at: string | null;
  deadline: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;

  // Applied tracking
  applied_method: string | null;
  applied_resume_version: string | null;
  applied_cover_letter: boolean;
  applied_referral: string | null;
  applied_follow_up_date: string | null;

  // Interview tracking
  interview_date: string | null;
  interview_type: string | null;
  interview_location: string | null;
  interview_contact: string | null;
  interview_prep: string | null;

  // Offer tracking
  offer_amount: number | null;
  offer_date: string | null;
  offer_deadline: string | null;

  // Rejection/archive tracking
  applied_date: string | null;
  rejected_date: string | null;
  rejection_reason: string | null;
  archived_date: string | null;
  archive_reason: string | null;
}
