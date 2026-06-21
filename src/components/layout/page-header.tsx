import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageAccent =
  | "blue"
  | "indigo"
  | "amber"
  | "purple"
  | "green"
  | "rose"
  | "cyan"
  | "slate";

const accentClasses: Record<PageAccent, { panel: string; icon: string }> = {
  blue: {
    panel: "border-blue-200 border-l-blue-500 bg-blue-50/70 dark:border-blue-900 dark:border-l-blue-500 dark:bg-blue-950/25",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
  },
  indigo: {
    panel: "border-indigo-200 border-l-indigo-500 bg-indigo-50/70 dark:border-indigo-900 dark:border-l-indigo-500 dark:bg-indigo-950/25",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
  },
  amber: {
    panel: "border-amber-200 border-l-amber-500 bg-amber-50/70 dark:border-amber-900 dark:border-l-amber-500 dark:bg-amber-950/25",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  purple: {
    panel: "border-purple-200 border-l-purple-500 bg-purple-50/70 dark:border-purple-900 dark:border-l-purple-500 dark:bg-purple-950/25",
    icon: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
  },
  green: {
    panel: "border-green-200 border-l-green-500 bg-green-50/70 dark:border-green-900 dark:border-l-green-500 dark:bg-green-950/25",
    icon: "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  },
  rose: {
    panel: "border-rose-200 border-l-rose-500 bg-rose-50/70 dark:border-rose-900 dark:border-l-rose-500 dark:bg-rose-950/25",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
  },
  cyan: {
    panel: "border-cyan-200 border-l-cyan-500 bg-cyan-50/70 dark:border-cyan-900 dark:border-l-cyan-500 dark:bg-cyan-950/25",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300",
  },
  slate: {
    panel: "border-slate-200 border-l-slate-500 bg-slate-50/70 dark:border-slate-700 dark:border-l-slate-400 dark:bg-slate-900/50",
    icon: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
};

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: PageAccent;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  accent,
  className,
}: PageHeaderProps) {
  const colors = accentClasses[accent];

  return (
    <header
      className={cn(
        "rounded-xl border border-l-4 px-4 py-4 sm:px-5",
        colors.panel,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2.5", colors.icon)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </header>
  );
}
