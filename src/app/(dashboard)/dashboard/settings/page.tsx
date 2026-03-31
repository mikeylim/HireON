import { Settings } from "lucide-react";

// Settings page — will hold scraper config, API keys, preferences
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Configure your job search preferences, scraping sources, and integrations.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
        <Settings className="mx-auto h-12 w-12 text-[var(--muted)]" />
        <h3 className="mt-4 text-lg font-semibold">Settings coming soon</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This is where you&apos;ll configure search keywords, location, salary range, and n8n integrations.
        </p>
      </div>
    </div>
  );
}
