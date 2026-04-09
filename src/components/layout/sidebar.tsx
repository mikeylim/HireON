"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Trophy,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "./theme-context";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "All Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { label: "Add Job", href: "/dashboard/add", icon: PlusCircle },
  { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { label: "Applied", href: "/dashboard/applied", icon: CheckCircle2 },
  { label: "Interviews", href: "/dashboard/interviews", icon: CalendarClock },
  { label: "Offers", href: "/dashboard/offers", icon: Trophy },
  { label: "Archived", href: "/dashboard/archived", icon: XCircle },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();

  // Cycle through: light → dark → system
  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + toggle button */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-3">
        <Link href="/dashboard" className={cn("flex items-center gap-2 transition-opacity hover:opacity-80", collapsed && "justify-center w-full")}>
          <Image
            src="/hireon-logo-light.png"
            alt="HireON"
            width={collapsed ? 28 : 140}
            height={collapsed ? 28 : 48}
            priority
            className="shrink-0 block dark:hidden ml-1.5 mb-2"
            style={{ width: collapsed ? "24px" : "132px", height: "auto" }}
          />
          <Image
            src="/hireon-logo-dark.png"
            alt="HireON"
            width={collapsed ? 28 : 140}
            height={collapsed ? 28 : 48}
            priority
            className="shrink-0 hidden dark:block mb-2"
            style={{ width: collapsed ? "28px" : "140px", height: "auto" }}
          />
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed — sits right below the logo */}
      {collapsed && (
        <button
          onClick={toggle}
          className="mx-auto mt-3 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* Navigation links */}
      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {menuItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — theme toggle + version */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <button
          onClick={cycleTheme}
          title={`Theme: ${themeLabel}`}
          className={cn(
            "flex items-center rounded-lg text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
            collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
          )}
        >
          <ThemeIcon className="h-4 w-4 shrink-0" />
          {!collapsed && themeLabel}
        </button>
      </div>
    </aside>
  );
}
