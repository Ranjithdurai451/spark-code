import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { APIError } from "@/lib/errors/errorHandler";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { logger } from "@/lib/logging/logger";
import { ErrorCode } from "@/lib/errors/errorCodes";
import type { GitHubTreeItem } from "@/types/api";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  logger.apiRequest("POST", "/api/github-tree");

  try {
    // Get NextAuth session token instead of Authorization header
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      throw APIError.create(ErrorCode.UNAUTHENTICATED, {
        message: "Authentication required. Please sign in with GitHub.",
      });
    }

    const githubToken = token.accessToken as string;

    const { repo }: { repo: string } = await req.json();

    if (!repo?.trim()) {
      throw APIError.create(ErrorCode.MISSING_REQUIRED_FIELD, {
        field: "repo",
        message: "Repository name is required",
      });
    }

    logger.info(`Fetching tree for repo: ${repo}`, { repo });

    // Step 1: Get user info and rate limit status
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logger.error("User fetch failed", {
        status: userResponse.status,
        errorText,
        rateLimitRemaining: userResponse.headers.get("x-ratelimit-remaining"),
      });

      if (userResponse.status === 401) {
        throw APIError.create(ErrorCode.TOKEN_EXPIRED, {
          message: "GitHub session expired. Please sign in again.",
          details: errorText,
          rateLimitRemaining: userResponse.headers.get("x-ratelimit-remaining"),
        });
      } else {
        throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
          message: `GitHub API error: ${userResponse.status}`,
          details: errorText,
          rateLimitRemaining: userResponse.headers.get("x-ratelimit-remaining"),
        });
      }
    }

    const user = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;

    logger.info(`User authenticated`, {
      user: user.login,
      rateLimitRemaining: userResponse.headers.get("x-ratelimit-remaining"),
    });

    // Step 2: Check repository access
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "User-Agent": "SparkCode-App/1.0",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      logger.error("Repository fetch failed", {
        repo: repoFullName,
        status: repoResponse.status,
        errorText,
      });

      if (repoResponse.status === 404) {
        throw APIError.create(ErrorCode.RESOURCE_NOT_FOUND, {
          message: `Repository '${repoFullName}' not found or access denied`,
          details: errorText,
        });
      } else {
        throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
          message: `Cannot access repository: ${repoResponse.status}`,
          details: errorText,
        });
      }
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || "main";

    logger.info(`Repository found`, {
      repo: repoFullName,
      branch: defaultBranch,
      size: repoData.size,
    });

    // Step 3: Fetch repository tree with fallbacks
    const treeUrls = [
      `https://api.github.com/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`,
      `https://api.github.com/repos/${repoFullName}/contents`, // Fallback for small repos
    ];

    let treeData: any[] | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let method = "tree";

    for (const [index, treeUrl] of treeUrls.entries()) {
      try {
        logger.debug(`Trying tree fetch method`, {
          method: index === 0 ? "git/trees" : "contents",
          attempt: index + 1,
        });

        const treeResponse = await fetch(treeUrl, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "User-Agent": "SparkCode-App/1.0",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (treeResponse.ok) {
          const data = await treeResponse.json();

          if (index === 0) {
            // Git trees API
            treeData = data.tree || [];
            method = "tree";
          } else {
            // Contents API - need to flatten
            treeData = await flattenContentsRecursively(
              repoFullName,
              githubToken,
              "",
              data,
            );
            method = "contents";
          }

          logger.info(`Tree fetch successful`, {
            method: index === 0 ? "git/trees" : "contents",
            itemCount: treeData!.length,
          });
          break;
        } else {
          logger.warn(`Tree fetch method failed`, {
            method: index === 0 ? "git/trees" : "contents",
            status: treeResponse.status,
          });
        }
      } catch (error: unknown) {
        logger.warn(`Tree fetch method error`, {
          method: index === 0 ? "git/trees" : "contents",
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    if (!treeData) {
      throw APIError.create(ErrorCode.OPERATION_FAILED, {
        message: "Failed to fetch repository tree with all methods",
        suggestion: "Try a smaller repository or check repository permissions",
      });
    }

    // Filter and normalize data
    const normalizedFiles = treeData
      .filter((item) => item.path && item.type)
      .map((item) => ({
        path: item.path,
        type: (item.type === "dir" ? "tree" : item.type) as "tree" | "blob", // Normalize 'dir' to 'tree'
        sha: item.sha,
        size: item.size || 0,
        url: item.url,
      }));

    logger.info(`Returning repository tree`, {
      repo: repoFullName,
      fileCount: normalizedFiles.length,
      method,
    });

    const processingTime = Date.now() - startTime;
    logger.apiResponse("POST", "/api/github-tree", 200, processingTime);

    return createSuccessResponse(
      {
        repository: repoFullName,
        branch: defaultBranch,
        files: normalizedFiles,
        count: normalizedFiles.length,
        method,
        rateLimitRemaining: userResponse.headers.get("x-ratelimit-remaining"),
      },
      {
        processingTime,
      },
    );
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    logger.error(
      "Unexpected error in github-tree API",
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
    logger.apiResponse("POST", "/api/github-tree", 500, processingTime);
    return createErrorResponse(error, { processingTime });
  }
}

// Helper function to recursively fetch contents (fallback method)
async function flattenContentsRecursively(
  repoFullName: string,
  token: string,
  path: string = "",
  items?: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<GitHubTreeItem[]> {
  const allItems: GitHubTreeItem[] = [];

  // If items not provided, fetch them
  if (!items) {
    const url = path
      ? `https://api.github.com/repos/${repoFullName}/contents/${path}`
      : `https://api.github.com/repos/${repoFullName}/contents`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) return [];
    items = await response.json();
  }

  if (!items) return allItems; // Defensive: if items is still undefined, return empty

  for (const item of items) {
    allItems.push(item);

    // Recursively fetch subdirectories (but limit depth to avoid rate limits)
    if (item.type === "dir" && path.split("/").length < 3) {
      try {
        const subItems = await flattenContentsRecursively(
          repoFullName,
          token,
          item.path,
        );
        allItems.push(...subItems);
      } catch (error) {
        logger.warn(`Failed to fetch subdirectory`, {
          path: item.path,
          error: (error as Error).message,
        });
      }
    }
  }

  return allItems;
}
