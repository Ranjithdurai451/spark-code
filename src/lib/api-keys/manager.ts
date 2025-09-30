export type ApiService = "gemini" | "judge0";

// Simple in-memory key index tracking (persists per server instance)
const currentKeyIndex: Record<ApiService, number> = {
  gemini: 0,
  judge0: 0,
};

/**
 * Get the next API key for a service (simple round-robin rotation)
 */
export function getNextApiKey(service: ApiService): string {
  const envPrefix = service.toUpperCase();
  const totalKeys = parseInt(process.env[`${envPrefix}_TOTAL_KEYS`] || "1");

  // Load keys from environment
  const keys: string[] = [];
  for (let i = 0; i < totalKeys; i++) {
    const key = process.env[`${envPrefix}_API_KEY_${i}`];
    if (key) {
      keys.push(key);
    }
  }

  // Fallback to single key if no indexed keys found
  if (keys.length === 0) {
    const singleKey = process.env[`${envPrefix}_API_KEY`];
    if (singleKey) {
      keys.push(singleKey);
    }
  }

  if (keys.length === 0) {
    throw new Error(`${envPrefix}_API_KEY environment variables not set`);
  }

  // Get current key and rotate to next
  const keyIndex = currentKeyIndex[service] % keys.length;
  const key = keys[keyIndex];

  // Rotate to next key for next call
  currentKeyIndex[service] = (keyIndex + 1) % keys.length;

  return key;
}

/**
 * Handle API quota errors by rotating to next key
 */
export function handleQuotaError(service: ApiService, error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || "";
  const errorString = String(error).toLowerCase();

  const quotaIndicators = [
    "quota exceeded",
    "rate limit exceeded",
    "429",
    "too many requests",
    "quota_exceeded",
    "rate_limit_exceeded",
    "exceeded your quota",
    "quota has been exceeded",
  ];

  const isQuotaError = quotaIndicators.some(
    (indicator) =>
      errorMessage.includes(indicator) || errorString.includes(indicator),
  );

  if (isQuotaError) {
    // Force rotation by incrementing the index
    currentKeyIndex[service] =
      (currentKeyIndex[service] + 1) %
      parseInt(process.env[`${service.toUpperCase()}_TOTAL_KEYS`] || "1");
    return true;
  }

  return false;
}

/**
 * Reset key index for a service (useful for testing)
 */
export function resetKeyIndex(service: ApiService): void {
  currentKeyIndex[service] = 0;
}
