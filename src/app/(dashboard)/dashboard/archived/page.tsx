import { XCircle } from "lucide-react";

// Archived/rejected — jobs you're done with (rejected, expired, not interested)
export default function ArchivedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Archived</h1>
        <p className="text-sm text-[var(--muted)]">
          Rejected, expired, or dismissed job postings.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-[var(--muted)]" />
        <h3 className="mt-4 text-lg font-semibold">Nothing archived</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Jobs you dismiss or that get rejected will end up here.
        </p>
      </div>
    </div>
  );
}
