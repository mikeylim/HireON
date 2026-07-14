const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_REQUEST_TIMEOUT_MS = 60_000;

function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL?.trim();

  if (!model) {
    throw new Error("GEMINI_MODEL is not configured");
  }

  return model;
}

export function getGeminiGenerateContentUrl(): string {
  const model = getGeminiModel();

  return `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
}

export function getGeminiGenerationDefaults(): {
  thinkingConfig?:
    | { thinkingLevel: "minimal" }
    | { thinkingBudget: 0 };
} {
  const model = getGeminiModel();

  // Gemini 3 models use named thinking levels. Minimal keeps structured
  // extraction and scoring responsive without relying on legacy token budgets.
  if (/^gemini-3(?:[.-]|$)/.test(model)) {
    return { thinkingConfig: { thinkingLevel: "minimal" } };
  }

  // Gemini 2.5 Flash models use the older numeric thinking budget.
  if (/^gemini-2\.5-flash(?:[.-]|$)/.test(model)) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }

  return {};
}
