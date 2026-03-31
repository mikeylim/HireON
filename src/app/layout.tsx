import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireON — Ontario Job Search Dashboard",
  description:
    "Smart job search dashboard for Ontario/GTA/Toronto. Scrape, filter, rank, and track job postings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
