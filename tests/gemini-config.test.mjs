import test from "node:test";
import assert from "node:assert/strict";
import {
  getGeminiGenerationDefaults,
  getGeminiModelCandidates,
} from "../src/lib/gemini/config.ts";

test("returns the primary and distinct fallback models in order", () => {
  assert.deepEqual(
    getGeminiModelCandidates({
      GEMINI_MODEL: " gemini-3.5-flash-lite ",
      GEMINI_FALLBACK_MODEL: " gemini-3.1-flash-lite ",
    }),
    ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
  );
});

test("omits an empty or duplicate fallback model", () => {
  assert.deepEqual(
    getGeminiModelCandidates({
      GEMINI_MODEL: "gemini-3.5-flash-lite",
      GEMINI_FALLBACK_MODEL: "gemini-3.5-flash-lite",
    }),
    ["gemini-3.5-flash-lite"]
  );
});

test("uses the generation defaults for the model handling each attempt", () => {
  assert.deepEqual(getGeminiGenerationDefaults("gemini-3.5-flash-lite"), {
    thinkingConfig: { thinkingLevel: "minimal" },
  });
  assert.deepEqual(getGeminiGenerationDefaults("gemini-2.5-flash-lite"), {
    thinkingConfig: { thinkingBudget: 0 },
  });
});
