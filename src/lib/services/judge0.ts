import { getNextApiKey, handleQuotaError } from "../api-keys/manager";

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";

export interface Judge0ExecuteParams {
  code: string;
  languageId: number;
  stdin?: string;
}

export async function executeOnJudge0({
  code,
  languageId,
  stdin = "",
}: Judge0ExecuteParams) {
  return executeOnJudge0WithRetry({ code, languageId, stdin });
}

/**
 * Execute on Judge0 with automatic key rotation on quota errors
 */
export async function executeOnJudge0WithRetry(
  params: Judge0ExecuteParams,
  maxRetries: number = 3,
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = getNextApiKey("judge0");

      const response = await fetch(
        `${JUDGE0_URL}?base64_encoded=false&wait=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
          body: JSON.stringify({
            source_code: params.code,
            language_id: params.languageId,
            stdin: params.stdin || "",
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Judge0 API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.warn(
        `Judge0 API call failed (attempt ${attempt + 1}/${maxRetries}):`,
        error.message,
      );

      // Check if this is a quota error and rotate key
      const keyRotated = handleQuotaError("judge0", error);

      if (keyRotated && attempt < maxRetries - 1) {
        continue; // Try with next key
      }

      // If not a quota error or we've exhausted retries, throw
      lastError = error;
      if (attempt === maxRetries - 1) break;
    }
  }

  throw lastError || new Error("Judge0 API call failed after all retries");
}
