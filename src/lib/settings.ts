// App settings stored in localStorage — will migrate to Supabase once auth is added

export interface AppSettings {
  defaultKeywords: string;      // comma-separated default search keywords
  defaultLocation: string;      // default location for scraping
  geminiContext: string;         // the "user is..." prompt sent to Gemini for scoring
  scoreThreshold: number;       // default minimum score for "Select above"
  defaultSources: string[];     // which sources are enabled by default
}

const STORAGE_KEY = "hireon-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  defaultKeywords: "",
  defaultLocation: "Toronto, ON",
  geminiContext:
    "junior developer looking for full-stack, frontend, or software developer roles in Toronto/GTA/Ontario",
  scoreThreshold: 40,
  defaultSources: ["jobbank", "adzuna", "jooble", "remotive"],
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
