import { Bookmark } from "lucide-react";

// Saved/bookmarked jobs — ones you want to come back to
export default function SavedJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs you bookmarked for later review.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-[var(--muted)]" />
        <h3 className="mt-4 text-lg font-semibold">No saved jobs</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bookmark jobs from the All Jobs page to see them here.
        </p>
      </div>
    </div>
  );
}
