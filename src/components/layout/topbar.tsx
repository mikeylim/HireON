"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, User, Settings, LogOut } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { titleCase } from "@/lib/utils";
import { JobDetailModal } from "@/components/jobs/job-detail-modal";
import type { Job } from "@/lib/types/job";
import type { User as SupaUser } from "@supabase/supabase-js";

export function Topbar() {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // User state
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load current user on mount
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createBrowserSupabase();
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .or(
          `title.ilike.%${query.trim()}%,company.ilike.%${query.trim()}%,location.ilike.%${query.trim()}%`
        )
        .order("relevance_score", { ascending: false, nullsFirst: false })
        .limit(8);

      setResults((data as Job[]) ?? []);
      setOpen(true);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectJob(job: Job) {
    setSelectedJob(job);
    setOpen(false);
    setQuery("");
  }

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function statusColor(status: string) {
    switch (status) {
      case "saved": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "applied": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "interview": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "offer": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  // Extract user info from Google OAuth or email
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
  const email = user?.email ?? "";
  const displayName = fullName ?? email.split("@")[0];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--sidebar-border)] bg-[var(--background)] px-6">
        {/* Global search */}
        <div ref={wrapperRef} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            placeholder="Search all jobs by title, company, location..."
            className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] py-2 pl-10 pr-10 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search results dropdown */}
          {open && (
            <div className="absolute left-0 top-full mt-1 w-full rounded-xl border border-[var(--sidebar-border)] bg-[var(--background)] shadow-lg">
              {searching ? (
                <p className="px-4 py-3 text-sm text-[var(--muted)]">Searching...</p>
              ) : results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto py-1">
                  {results.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--accent)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {titleCase(job.title)}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {job.company} · {job.location}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(job.status)}`}>
                          {job.status}
                        </span>
                        {job.relevance_score !== null && (
                          <span className="text-xs font-bold text-[var(--muted)]">
                            {job.relevance_score}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-[var(--muted)]">
                  No jobs found for &quot;{query}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Profile menu — or sign in link for guests */}
        {!user ? (
          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Sign in
          </Link>
        ) : (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--accent)]"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden text-sm font-medium sm:block">
                {displayName}
              </span>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--sidebar-border)] bg-[var(--background)] py-1 shadow-lg">
                {/* User info */}
                <div className="border-b border-[var(--sidebar-border)] px-4 py-3">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{email}</p>
                </div>

                {/* Menu items */}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--destructive)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Job detail modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={(updated) => setSelectedJob(updated)}
          onDelete={() => setSelectedJob(null)}
        />
      )}
    </>
  );
}
