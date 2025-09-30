// /lib/apiKeyCache.ts
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { decryptKey } from "./crypto";

interface CachedKeys {
  geminiKey: string;
  judge0Key: string;
  timestamp: number;
  mode: "local" | "secure";
  userId: string;
}

// Advanced caching system with Redis/external cache support
class ApiKeyCache {
  private localCache = new Map<string, CachedKeys>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 minutes
  private readonly REDIS_TTL = 55 * 60; // 55 minutes in Redis (seconds)
  private redisClient: any = null;

  constructor() {
    // Initialize Redis client if available
    this.initRedis();
  }

  private async initRedis() {
    try {
      // Check if Redis is available
      if (process.env.REDIS_URL) {
        // For production, you would use a proper Redis client like ioredis
        // For now, we'll use a simple in-memory fallback with Redis simulation

        this.redisClient = {
          get: async (key: string) => {
            // Simulate Redis get - in real implementation, use actual Redis client
            return this.localCache.get(key) || null;
          },
          set: async (key: string, value: string, ttl?: number) => {
            // Simulate Redis set - in real implementation, use actual Redis client
            const data = JSON.parse(value);
            this.localCache.set(key, data);
            // Set TTL simulation
            setTimeout(
              () => {
                this.localCache.delete(key);
              },
              ttl ? ttl * 1000 : this.CACHE_TTL,
            );
            return true;
          },
          del: async (key: string) => {
            this.localCache.delete(key);
            return true;
          },
        };
      }
    } catch (error) {
      console.warn("⚠️ Redis initialization failed, using local cache:", error);
    }
  }

  private async get(key: string): Promise<CachedKeys | null> {
    if (this.redisClient) {
      try {
        const data = await this.redisClient.get(`apikey:${key}`);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn("Redis get failed, falling back to local cache:", error);
      }
    }
    return this.localCache.get(key) || null;
  }

  private async set(key: string, value: CachedKeys): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `apikey:${key}`,
          JSON.stringify(value),
          this.REDIS_TTL,
        );
      } catch (error) {
        console.warn("Redis set failed, falling back to local cache:", error);
      }
    }
    this.localCache.set(key, value);
  }

  private async delete(key: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(`apikey:${key}`);
      } catch (error) {
        console.warn("Redis delete failed:", error);
      }
    }
    this.localCache.delete(key);
  }

  async getCachedKeys(userId: string): Promise<CachedKeys | null> {
    const cached = await this.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  async setCachedKeys(userId: string, keys: CachedKeys): Promise<void> {
    await this.set(userId, keys);
  }

  async clearUserCache(userId: string): Promise<void> {
    await this.delete(userId);
  }

  async clearAllCache(): Promise<void> {
    // For Redis, we'd need to use KEYS pattern, but for simplicity:
    this.localCache.clear();
  }

  async getCacheStats() {
    return {
      size: this.localCache.size,
      keys: Array.from(this.localCache.keys()),
      oldestEntry:
        this.localCache.size > 0
          ? Math.min(
              ...Array.from(this.localCache.values()).map((v) => v.timestamp),
            )
          : null,
      redisEnabled: !!this.redisClient,
    };
  }
}

const keyCache = new ApiKeyCache();

export async function getApiKeys(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    const userId = token.sub as string;

    // Check cache first
    const cached = await keyCache.getCachedKeys(userId);
    if (cached) {
      return {
        geminiKey: cached.geminiKey,
        judge0Key: cached.judge0Key,
        mode: cached.mode as "secure",
      };
    }

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
        const cachedKeys: CachedKeys = {
          geminiKey,
          judge0Key,
          timestamp: Date.now(),
          mode: "secure",
          userId,
        };
        await keyCache.setCachedKeys(userId, cachedKeys);

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
export async function clearUserCache(userId: string) {
  await keyCache.clearUserCache(userId);
}

// Optional: Clear all cache (useful for memory management)
export async function clearAllCache() {
  await keyCache.clearAllCache();
}

// Optional: Get cache stats (for monitoring)
export async function getCacheStats() {
  return await keyCache.getCacheStats();
}
