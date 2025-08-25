// /lib/apiKeyCache.ts
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { decryptKey } from "./apiKeyCrypto";

interface CachedKeys {
  geminiKey: string;
  judge0Key: string;
  timestamp: number;
  mode: "local" | "secure";
  userId: string;
}

// In-memory cache (per function instance)
const keyCache = new Map<string, CachedKeys>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

export async function getApiKeys(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    const userId = token.sub as string;

    // Check cache first
    const cached = keyCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("🎯 Cache HIT - using cached decrypted keys");
      return {
        geminiKey: cached.geminiKey,
        judge0Key: cached.judge0Key,
        mode: cached.mode as "secure",
      };
    }

    console.log("🔄 Cache MISS - fetching and decrypting keys...");

    // SECURE MODE: Check if cookie exists
    const cookieStore = cookies();
    const keysCookie = (await cookieStore).get("encrypted-keys");

    if (!keysCookie) {
      // Cookie missing = expired or deleted
      return {
        geminiKey: null,
        judge0Key: null,
        mode: "secure",
        error: "Keys expired or missing - please re-enter your API keys",
      };
    }

    try {
      const keyData = JSON.parse(keysCookie.value);

      // Just verify user match
      if (keyData.userId === userId) {
        // Decrypt keys
        const geminiKey = decryptKey(keyData.gemini, userId);
        const judge0Key = decryptKey(keyData.judge0, userId);

        // Cache the decrypted keys
        keyCache.set(userId, {
          geminiKey,
          judge0Key,
          timestamp: Date.now(),
          mode: "secure",
          userId,
        });

        console.log("🔐 Keys decrypted and cached successfully");

        return {
          geminiKey,
          judge0Key,
          mode: "secure",
        };
      }
    } catch (error) {
      console.error("🚫 Key decryption error:", error);
      return {
        geminiKey: null,
        judge0Key: null,
        mode: "secure",
        error: "Invalid or corrupted keys - please re-enter",
      };
    }
  }

  return { geminiKey: null, judge0Key: null, mode: "local" };
}

// Optional: Clear cache for specific user (useful for sign-out)
export function clearUserCache(userId: string) {
  keyCache.delete(userId);
  console.log("🗑️ Cleared cache for user:", userId);
}

// Optional: Clear all cache (useful for memory management)
export function clearAllCache() {
  keyCache.clear();
  console.log("🗑️ Cleared all cached keys");
}

// Optional: Get cache stats (for monitoring)
export function getCacheStats() {
  return {
    size: keyCache.size,
    keys: Array.from(keyCache.keys()),
    oldestEntry: Math.min(
      ...Array.from(keyCache.values()).map((v) => v.timestamp)
    ),
  };
}
