import type { MetadataRoute } from "next";

// Generates robots.txt — tells search engines what to crawl
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block crawlers from auth and personal data routes
        disallow: ["/api/", "/auth/", "/dashboard/"],
      },
    ],
    sitemap: "https://hireon-jobs.vercel.app/sitemap.xml",
  };
}
