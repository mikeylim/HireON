"use client";

import { Search, Bell } from "lucide-react";

// Top bar sits above the main content area (right of sidebar)
// Houses the global search and notifications
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] bg-[var(--background)] px-6">
      {/* Search input — will hook up to job filtering later */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          placeholder="Search jobs by title, company, keyword..."
          className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] py-2 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]">
          <Bell className="h-5 w-5" />
          {/* Notification dot — shows when there are new scraped jobs */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--destructive)]" />
        </button>
      </div>
    </header>
  );
}
