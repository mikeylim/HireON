const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export function getGeminiGenerateContentUrl(): string {
  const model = process.env.GEMINI_MODEL?.trim();

  if (!model) {
    throw new Error("GEMINI_MODEL is not configured");
  }

  return `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
}
