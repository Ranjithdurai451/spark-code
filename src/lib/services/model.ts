import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getNextApiKey, handleQuotaError } from "../api-keys/manager";

export type GeminiModelName =
  | "gemini-2.0-flash"
  | "gemini-2.5-flash"
  | "gemini-2.0-flash-lite";

export function createGeminiClient() {
  const apiKey = getNextApiKey("gemini");
  return createGoogleGenerativeAI({ apiKey });
}

export function getGeminiModel(
  modelName: GeminiModelName = "gemini-2.0-flash",
) {
  const gemini = createGeminiClient();
  return gemini(modelName);
}

/**
 * Execute a Gemini API call with automatic key rotation on quota errors
 */
export async function executeGeminiWithRetry<T>(
  operation: (model: any) => Promise<T>,
  modelName: GeminiModelName = "gemini-2.0-flash",
  maxRetries: number = 3,
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = getGeminiModel(modelName);
      const result = await operation(model);
      return result;
    } catch (error: any) {
      console.warn(
        `Gemini API call failed (attempt ${attempt + 1}/${maxRetries}):`,
        error.message,
      );

      // Check if this is a quota error and rotate key
      const keyRotated = handleQuotaError("gemini", error);

      if (keyRotated && attempt < maxRetries - 1) {
        continue; // Try with next key
      }

      // If not a quota error or we've exhausted retries, throw
      lastError = error;
      if (attempt === maxRetries - 1) break;
    }
  }

  throw lastError || new Error("Gemini API call failed after all retries");
}

/**
 * Create a streaming Gemini model with key rotation
 */
export function createStreamingGeminiModel(
  modelName: GeminiModelName = "gemini-2.0-flash",
) {
  const gemini = createGeminiClient();
  return gemini(modelName);
}

/**
 * Get a Gemini model for streaming (alias for createStreamingGeminiModel)
 */
export function getStreamingGeminiModel(
  modelName: GeminiModelName = "gemini-2.0-flash",
) {
  return createStreamingGeminiModel(modelName);
}
