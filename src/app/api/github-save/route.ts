import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";

type RequestBody = {
  repo: string; // e.g. "dsa-solutions"
  path: string; // e.g. "DSA/arrays/TwoSum.java"
  content: string; // raw file content
  message: string; // commit message
};

type GitHubUser = {
  login: string;
  id: number;
  avatar_url: string;
};

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  logger.apiRequest(req.method, req.url);

  try {
    logger.info("Starting GitHub save operation");
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

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      throw APIError.create(ErrorCode.INVALID_REQUEST, {
        message: "Invalid JSON in request body",
      });
    }

    const { repo, path, content, message } = body;

    if (!repo?.trim()) {
      throw APIError.create(ErrorCode.MISSING_REQUIRED_FIELD, {
        field: "repo",
        message: "Repository name is required",
      });
    }

    if (!path?.trim()) {
      throw APIError.create(ErrorCode.MISSING_REQUIRED_FIELD, {
        field: "path",
        message: "File path is required",
      });
    }

    if (!content) {
      throw APIError.create(ErrorCode.MISSING_REQUIRED_FIELD, {
        field: "content",
        message: "File content is required",
      });
    }

    if (!message?.trim()) {
      throw APIError.create(ErrorCode.MISSING_REQUIRED_FIELD, {
        field: "message",
        message: "Commit message is required",
      });
    }

    // Validate path format
    if (path.includes("..") || path.startsWith("/") || path.endsWith("/")) {
      throw APIError.create(ErrorCode.INVALID_FORMAT, {
        field: "path",
        message: "Invalid file path format",
      });
    }

    // Step 1: Verify token and get user info
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
      logger.externalAPI("GitHub", "user", false, {
        status: userResponse.status,
        error: errorText,
      });

      if (userResponse.status === 401) {
        throw APIError.create(ErrorCode.UNAUTHENTICATED, {
          message: "GitHub session expired. Please sign in again.",
        });
      }

      throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
        message: "Failed to verify GitHub authentication",
        status: userResponse.status,
        error: errorText,
      });
    }

    const user: GitHubUser = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;
    const repoApiUrl = `https://api.github.com/repos/${repoFullName}`;

    // Step 2: Check if repository exists and user has access
    const repoResponse = await fetch(repoApiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    let repoExists = false;
    let repositoryData: GitHubRepo | null = null;

    if (repoResponse.ok) {
      repositoryData = await repoResponse.json();
      repoExists = true;

      // Check if user has push permissions
      if (
        !repositoryData?.permissions?.push &&
        !repositoryData?.permissions?.admin
      ) {
        throw APIError.create(ErrorCode.UNAUTHORIZED, {
          message: "Insufficient permissions to push to this repository",
        });
      }
    } else if (repoResponse.status === 404) {
      // Repository doesn't exist - we'll create it
      repoExists = false;
    } else {
      const errorData = await repoResponse.text();
      logger.externalAPI("GitHub", "repo_check", false, {
        status: repoResponse.status,
        error: errorData,
      });

      throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
        message:
          "Unable to access repository. Check permissions and repository name.",
        status: repoResponse.status,
        error: errorData,
      });
    }

    // Step 3: Create repository if it doesn't exist
    if (!repoExists) {
      const createRepoResponse = await fetch(
        "https://api.github.com/user/repos",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json",
            "User-Agent": "SparkCode-App/1.0",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            name: repo,
            description:
              "DSA solutions and code snippets created with SparkCode",
            auto_init: true,
            private: false,
          }),
        },
      );

      if (!createRepoResponse.ok) {
        const createError = await createRepoResponse.text();
        logger.externalAPI("GitHub", "create_repo", false, {
          status: createRepoResponse.status,
          error: createError,
        });

        throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
          message: `Failed to create repository: ${createError}`,
          status: createRepoResponse.status,
          error: createError,
        });
      }

      // Wait a moment for repository to be fully created
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 4: Check if file already exists (to get SHA for updates)
    let existingFileSha: string | undefined = undefined;
    const fileCheckUrl = `${repoApiUrl}/contents/${encodeURIComponent(path)}`;

    const fileCheckResponse = await fetch(fileCheckUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (fileCheckResponse.ok) {
      const existingFile = await fileCheckResponse.json();
      existingFileSha = existingFile.sha;
    }

    // Step 5: Create or update the file
    const fileOperationUrl = `${repoApiUrl}/contents/${encodeURIComponent(path)}`;
    const filePayload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: message.trim(),
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: "main",
    };

    // Add SHA if updating existing file
    if (existingFileSha) {
      filePayload.sha = existingFileSha;
    }

    const fileOperationResponse = await fetch(fileOperationUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        "User-Agent": "SparkCode-App/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(filePayload),
    });

    if (!fileOperationResponse.ok) {
      const operationError = await fileOperationResponse.text();
      logger.externalAPI("GitHub", "file_operation", false, {
        status: fileOperationResponse.status,
        error: operationError,
      });

      // Try to parse error message from GitHub
      try {
        const errorJson = JSON.parse(operationError);
        throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
          message: errorJson.message || "Failed to save file to GitHub",
          status: fileOperationResponse.status,
          error: operationError,
        });
      } catch (parseError) {
        if (parseError instanceof APIError) {
          throw parseError;
        }
        throw APIError.create(ErrorCode.GITHUB_API_ERROR, {
          message:
            "Failed to save file to GitHub. Please check your permissions.",
          status: fileOperationResponse.status,
          error: operationError,
        });
      }
    }

    const result = await fileOperationResponse.json();

    logger.externalAPI("GitHub", "file_operation", true);

    // Return success response with file details
    const response = createSuccessResponse({
      file: {
        path: path,
        url: result.content?.html_url,
        sha: result.content?.sha,
      },
      repository: {
        name: repoFullName,
        url: `https://github.com/${repoFullName}`,
      },
    });

    logger.apiResponse(req.method, req.url, 200, Date.now() - startTime);
    return response;
  } catch (error: unknown) {
    logger.error(
      "GitHub save operation failed",
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );

    const apiError =
      error instanceof APIError
        ? error
        : APIError.create(ErrorCode.INTERNAL_ERROR, {
            originalError:
              error instanceof Error ? error.message : String(error),
          });

    logger.apiResponse(
      req.method,
      req.url,
      apiError.statusCode,
      Date.now() - startTime,
    );
    return createErrorResponse(apiError);
  }
}
