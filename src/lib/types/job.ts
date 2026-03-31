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
}
