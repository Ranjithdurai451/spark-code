import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type GeminiModelName =
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-pro-latest";

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }
  return createGoogleGenerativeAI({ apiKey });
}

export function getGeminiModel(
  modelName: GeminiModelName = "gemini-2.0-flash"
) {
  const gemini = createGeminiClient();
  return gemini(modelName);
}
