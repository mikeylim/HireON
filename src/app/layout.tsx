import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/theme-context";
import "./globals.css";
import Script from "next/script";

// Use the deployed URL for absolute metadata URLs (og:image, canonical)
const SITE_URL = "https://hireon-jobs.vercel.app";

export const metadata: Metadata = {
  // Title template: each page can override, but the brand suffix stays
  title: {
    default: "HireON — Ontario Job Search Dashboard",
    template: "%s · HireON",
  },
  description:
    "AI-powered job search dashboard for Ontario, GTA, and Toronto. Scrape job postings from Job Bank, Adzuna, Jooble, and Remotive. Score relevance with Gemini AI. Track applications from saved to offer in one place.",
  keywords: [
    "job search",
    "Ontario jobs",
    "Toronto jobs",
    "GTA jobs",
    "Canada jobs",
    "Job Bank Canada",
    "job tracker",
    "AI job search",
    "application tracker",
    "Gemini AI",
  ],
  authors: [{ name: "Mike Dohyun Lim" }],
  creator: "Mike Dohyun Lim",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  // Open Graph — used by Facebook, LinkedIn, Slack, Discord, etc.
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    title: "HireON — Ontario Job Search Dashboard",
    description:
      "AI-powered job search dashboard for Ontario/GTA/Toronto. Multi-source scraping, Gemini relevance scoring, and application tracking.",
    siteName: "HireON",
    images: [
      {
        url: "/hireon-logo-light.png",
        width: 1200,
        height: 630,
        alt: "HireON — Ontario Job Search Dashboard",
      },
    ],
  },
//   // Twitter / X
//   twitter: {
//     card: "summary_large_image",
//     title: "HireON — Ontario Job Search Dashboard",
//     description:
//       "AI-powered job search dashboard for Ontario/GTA/Toronto. Multi-source scraping, Gemini relevance scoring, and application tracking.",
//     images: ["/hireon-logo-light.png"],
//   },
  // Search engine crawler instructions
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Favicon and Apple touch icon
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

// Viewport and theme color — separated from metadata in Next.js 15
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Google Tag Manager */}
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MZ3QGV4T');
        `}
      </Script>

      <body className="antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MZ3QGV4T"
            height="0" width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}