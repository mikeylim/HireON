import { CheckCircle2 } from "lucide-react";

// Applied jobs — track where you've already submitted applications
export default function AppliedJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applied</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs you&apos;ve submitted applications for.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--muted)]" />
        <h3 className="mt-4 text-lg font-semibold">No applications yet</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Mark jobs as &quot;Applied&quot; to track them here.
        </p>
      </div>
    </div>
  );
}
