import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";

type FileRequestBody = {
  repo: string;
  path: string;
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest("POST", req.url);
    // Get NextAuth session token instead of Authorization header
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      logger.apiResponse("POST", req.url, 401, Date.now() - startTime, {
        error: "authentication_required",
      });
      throw APIError.create(
        ErrorCode.UNAUTHENTICATED,
        {},
        "Authentication required. Please sign in with GitHub again.",
      );
    }

    const githubToken = token.accessToken as string;

    // Parse request body
    let body: FileRequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "invalid_request_body",
      });
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        {},
        "Invalid request body",
      );
    }

    const { repo, path } = body;

    if (!repo?.trim() || !path?.trim()) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "missing_required_fields",
      });
      throw APIError.create(
        ErrorCode.MISSING_REQUIRED_FIELD,
        {},
        "Repository and file path are required",
      );
    }

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      console.error("GitHub user fetch failed:", userResponse.status);
      logger.apiResponse("POST", req.url, 401, Date.now() - startTime, {
        error: "github_auth_failed",
        status: userResponse.status,
      });
      throw APIError.create(
        ErrorCode.EXTERNAL_API_ERROR,
        { status: userResponse.status },
        "GitHub authentication failed. Please reconnect in Settings.",
      );
    }

    const user = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;

    // Fetch file content
    const fileUrl = `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(path)}`;

    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!fileResponse.ok) {
      console.error("File fetch failed:", fileResponse.status);

      let errorMessage = "Failed to fetch file content";
      let errorCode = ErrorCode.EXTERNAL_API_ERROR;

      if (fileResponse.status === 404) {
        errorMessage = `File not found: ${path}`;
        errorCode = ErrorCode.RESOURCE_NOT_FOUND;
      } else if (fileResponse.status === 403) {
        errorMessage = "Access denied. Check repository permissions.";
        errorCode = ErrorCode.UNAUTHORIZED;
      } else if (fileResponse.status === 401) {
        errorMessage = "GitHub authentication expired. Please sign in again.";
        errorCode = ErrorCode.UNAUTHENTICATED;
      }

      logger.apiResponse(
        "POST",
        req.url,
        fileResponse.status,
        Date.now() - startTime,
        {
          error: "github_file_fetch_failed",
          status: fileResponse.status,
          repo,
          path,
        },
      );
      throw APIError.create(
        errorCode,
        { status: fileResponse.status, repo, path },
        errorMessage,
      );
    }

    const fileData = await fileResponse.json();

    // Handle different content types
    let content: string;

    if (fileData.content) {
      // Decode base64 content
      try {
        content = Buffer.from(fileData.content, "base64").toString("utf8");
      } catch (decodeError) {
        console.error("Base64 decode error:", decodeError);
        logger.apiResponse("POST", req.url, 500, Date.now() - startTime, {
          error: "decode_error",
          repo,
          path,
        });
        throw APIError.create(
          ErrorCode.INTERNAL_ERROR,
          { repo, path },
          "Failed to decode file content. File may be binary or corrupted.",
        );
      }
    } else {
      // Handle large files or other cases
      if (fileData.size > 1000000) {
        // 1MB limit
        logger.apiResponse("POST", req.url, 413, Date.now() - startTime, {
          error: "file_too_large",
          size: fileData.size,
        });
        throw APIError.create(
          ErrorCode.INVALID_REQUEST,
          { size: fileData.size },
          "File too large to import (>1MB). Please use a smaller file.",
        );
      }

      logger.apiResponse("POST", req.url, 422, Date.now() - startTime, {
        error: "file_content_unavailable",
      });
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        {},
        "File content not available or file is binary.",
      );
    }

    logger.apiResponse("POST", req.url, 200, Date.now() - startTime, {
      success: true,
      name: fileData.name,
      path: fileData.path,
      size: fileData.size,
    });

    return createSuccessResponse({
      content,
      name: fileData.name,
      path: fileData.path,
      size: fileData.size,
      sha: fileData.sha,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      duration: Date.now() - startTime,
      url: req.url,
    });
  }
}
