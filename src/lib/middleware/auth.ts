/**
 * Authentication middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { APIError } from "../errors/errorHandler";
import { ErrorCode } from "../errors/errorCodes";
import { createErrorResponse } from "../responses/errorResponse";
import { logger } from "../logging/logger";
import { User, RequestContext } from "@/types/api";
import { supabaseAdmin } from "../database/supabase";

export interface AuthResult {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
}

/**
 * Authenticate user using NextAuth token
 */
export async function authenticateUser(req: NextRequest): Promise<AuthResult> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      return {
        user: null,
        isAuthenticated: false,
      };
    }

    // Validate token structure
    if (!token.sub || !token.login) {
      logger.warn("Invalid token structure", {
        hasSub: !!token.sub,
        hasLogin: !!token.login,
        tokenKeys: Object.keys(token),
      });

      return {
        user: null,
        isAuthenticated: false,
      };
    }
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", token.sub)
      .select(
        `
          id, login, email, name, avatar_url, credits,
          total_credits_earned, total_credits_spent,
          created_at, updated_at, last_login_at
        `,
      )
      .single();
    if (error) {
      console.error("User update error:", error);
      throw error;
    }
    // Construct user object from token

    logger.authEvent("token_validated", user.id, {
      login: user.login,
      email: user.email,
    });

    return {
      user,
      isAuthenticated: true,
      token: token.accessToken as string,
    };
  } catch (error) {
    logger.error(
      "Authentication failed",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        url: req.url,
        method: req.method,
      },
      error instanceof Error ? error : undefined,
    );

    return {
      user: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Require authentication for a route
 * Throws APIError if authentication fails
 */
export async function requireAuth(req: NextRequest): Promise<User> {
  const authResult = await authenticateUser(req);

  if (!authResult.isAuthenticated || !authResult.user) {
    throw APIError.create(ErrorCode.UNAUTHENTICATED, {
      url: req.url,
      method: req.method,
    });
  }

  return authResult.user;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(req: NextRequest): Promise<User | null> {
  const authResult = await authenticateUser(req);
  return authResult.user;
}

/**
 * Higher-order function to wrap route handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (user: User, req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    redirectTo?: string;
    publicPaths?: string[];
  } = {},
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // Check if path is public
      const pathname = new URL(req.url).pathname;
      if (options.publicPaths?.some((path) => pathname.startsWith(path))) {
        // For public paths, try optional auth
        const user = await optionalAuth(req);
        return await handler(user as User, req, ...args);
      }

      // Require authentication
      const user = await requireAuth(req);

      logger.apiRequest(req.method, req.url, {
        userId: user.id,
        authenticated: true,
      });

      const response = await handler(user, req, ...args);

      logger.apiResponse(
        req.method,
        req.url,
        response.status,
        Date.now() - startTime,
        { userId: user.id },
      );

      return response;
    } catch (error) {
      logger.apiResponse(
        req.method,
        req.url,
        error instanceof APIError ? error.statusCode : 500,
        Date.now() - startTime,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          authenticated: false,
        },
      );

      if (error instanceof APIError) {
        return createErrorResponse(error, {
          processingTime: Date.now() - startTime,
        });
      }

      // Handle unexpected errors
      const apiError = APIError.create(ErrorCode.INTERNAL_ERROR, {
        originalError: error instanceof Error ? error.message : "Unknown error",
      });

      return createErrorResponse(apiError, {
        processingTime: Date.now() - startTime,
      });
    }
  };
}

/**
 * Create request context with user information
 */
export async function createRequestContext(
  req: NextRequest,
  user?: User,
): Promise<RequestContext> {
  const requestId = generateRequestId();

  return {
    user: user!,
    startTime: Date.now(),
    requestId,
    userAgent: req.headers.get("user-agent") || undefined,
    ip: getClientIP(req),
  };
}

/**
 * Validate GitHub token specifically
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return response.ok;
  } catch (error) {
    logger.error(
      "GitHub token validation failed",
      {},
      error instanceof Error ? error : undefined,
    );
    return false;
  }
}

/**
 * Refresh user session data from database
 */
export async function refreshUserSession(userId: string): Promise<User | null> {
  try {
    // This would typically fetch updated user data from database
    // For now, return the user as-is since we don't have direct DB access here
    logger.debug("User session refresh requested", { userId });
    return null; // Indicates no refresh needed
  } catch (error) {
    logger.error(
      "Failed to refresh user session",
      { userId },
      error instanceof Error ? error : undefined,
    );
    return null;
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string | undefined {
  // Check various headers for IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const clientIP = req.headers.get("x-client-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  if (realIP) return realIP;
  if (clientIP) return clientIP;

  return undefined;
}
