import axios from "axios";
import {
  GEMINI_REQUEST_TIMEOUT_MS,
  getGeminiGenerateContentUrl,
  getGeminiGenerationDefaults,
  getGeminiModelCandidates,
} from "@/lib/gemini/config";

interface GeminiProviderError {
  error?: {
    status?: string;
  };
}

interface GeminiGenerateContentRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: Record<string, unknown>;
}

export interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
}

function isTransientGeminiError(error: unknown): boolean {
  if (!axios.isAxiosError<GeminiProviderError>(error)) return false;

  const httpStatus = error.response?.status;
  const providerStatus = error.response?.data?.error?.status;

  return (
    providerStatus === "UNAVAILABLE" ||
    httpStatus === 500 ||
    httpStatus === 502 ||
    httpStatus === 503 ||
    httpStatus === 504
  );
}

/**
 * Sends one Gemini request and makes at most one additional attempt when the
 * provider is temporarily unavailable. If a distinct fallback model is
 * configured, that second attempt uses it; otherwise it retries the primary.
 */
export async function generateGeminiContent(
  request: GeminiGenerateContentRequest
): Promise<GeminiGenerateContentResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const models = getGeminiModelCandidates();
  const attempts = [models[0], models[1] ?? models[0]];

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
    const model = attempts[attemptIndex];

    try {
      const { data } = await axios.post<GeminiGenerateContentResponse>(
        getGeminiGenerateContentUrl(model),
        {
          ...request,
          generationConfig: {
            ...getGeminiGenerationDefaults(model),
            ...request.generationConfig,
          },
        },
        {
          headers: { "x-goog-api-key": apiKey },
          timeout: GEMINI_REQUEST_TIMEOUT_MS,
        }
      );

      return data;
    } catch (error) {
      const hasAnotherAttempt = attemptIndex < attempts.length - 1;

      if (!hasAnotherAttempt || !isTransientGeminiError(error)) {
        throw error;
      }

      console.warn("[gemini] temporary provider failure; retrying", {
        currentModel: model,
        retryModel: attempts[attemptIndex + 1],
        httpStatus: axios.isAxiosError(error) ? error.response?.status : undefined,
      });
    }
  }

  throw new Error("Gemini request failed without a response");
}
