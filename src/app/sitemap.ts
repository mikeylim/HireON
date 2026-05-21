import type { MetadataRoute } from "next";

const SITE_URL = "https://hireon-jobs.vercel.app";

// Sitemap — lists public pages for search engine crawlers
// Auth-protected pages don't belong here since crawlers can't access them anyway
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
