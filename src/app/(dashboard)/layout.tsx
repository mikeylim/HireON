"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { PreviewProvider } from "@/components/jobs/preview-context";
import { GuestBanner } from "@/components/layout/guest-banner";
import { cn } from "@/lib/utils";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <GuestBanner />
        <Topbar />
        <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <PreviewProvider>
        <DashboardShell>{children}</DashboardShell>
      </PreviewProvider>
    </SidebarProvider>
  );
}
