// A scraped job before it's saved — lives in memory, not in the database
export interface PreviewJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  posted_at: string | null;
  job_type: string;
  work_mode: string;
  tags: string[];
  relevance_score: number | null;
  score_reason?: string;
  selected: boolean; // whether the user has checked this for saving
}
