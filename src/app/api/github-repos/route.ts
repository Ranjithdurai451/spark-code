// /app/api/github/repos/route.ts
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest("GET", req.url);

    // Get token server-side (this is secure)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.accessToken) {
      logger.apiResponse("GET", req.url, 401, Date.now() - startTime, {
        error: "authentication_required",
      });
      throw APIError.create(
        ErrorCode.UNAUTHENTICATED,
        {},
        "Authentication required. Please sign in with GitHub again.",
      );
    }

    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&type=owner",
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      logger.apiResponse(
        "GET",
        req.url,
        response.status,
        Date.now() - startTime,
        {
          error: "github_api_error",
          status: response.status,
        },
      );
      throw APIError.create(
        ErrorCode.EXTERNAL_API_ERROR,
        { status: response.status },
        "Failed to fetch repositories from GitHub.",
      );
    }

    const repos = await response.json();
    const filteredRepos = repos.filter(
      (repo: { private: boolean; permissions?: { push: boolean } }) =>
        !repo.private || repo.permissions?.push,
    );

    logger.apiResponse("GET", req.url, 200, Date.now() - startTime, {
      repoCount: filteredRepos.length,
    });

    return createSuccessResponse(filteredRepos);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      duration: Date.now() - startTime,
      url: req.url,
    });
  }
}
