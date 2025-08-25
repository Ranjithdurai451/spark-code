import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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
  try {
    console.log("working");
    // Get NextAuth session token instead of Authorization header
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in with GitHub.",
        },
        { status: 401 }
      );
    }

    const githubToken = token.accessToken as string;

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
        },
        { status: 400 }
      );
    }

    const { repo, path, content, message } = body;

    if (!repo?.trim()) {
      return NextResponse.json(
        {
          error: "Repository name is required",
        },
        { status: 400 }
      );
    }

    if (!path?.trim()) {
      return NextResponse.json(
        {
          error: "File path is required",
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          error: "File content is required",
        },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        {
          error: "Commit message is required",
        },
        { status: 400 }
      );
    }

    // Validate path format
    if (path.includes("..") || path.startsWith("/") || path.endsWith("/")) {
      return NextResponse.json(
        {
          error: "Invalid file path format",
        },
        { status: 400 }
      );
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
      console.error(
        "GitHub user fetch failed:",
        userResponse.status,
        errorText
      );

      if (userResponse.status === 401) {
        return NextResponse.json(
          {
            error: "GitHub session expired. Please sign in again.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to verify GitHub authentication",
        },
        { status: 401 }
      );
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
        return NextResponse.json(
          {
            error: "Insufficient permissions to push to this repository",
          },
          { status: 403 }
        );
      }
    } else if (repoResponse.status === 404) {
      // Repository doesn't exist - we'll create it
      repoExists = false;
    } else {
      const errorData = await repoResponse.text();
      console.error("Repository check failed:", repoResponse.status, errorData);

      return NextResponse.json(
        {
          error:
            "Unable to access repository. Check permissions and repository name.",
        },
        { status: 403 }
      );
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
        }
      );

      if (!createRepoResponse.ok) {
        const createError = await createRepoResponse.text();
        console.error(
          "Repository creation failed:",
          createRepoResponse.status,
          createError
        );

        return NextResponse.json(
          {
            error: `Failed to create repository: ${createError}`,
          },
          { status: 500 }
        );
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
    const filePayload = {
      message: message.trim(),
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: "main",
    };

    // Add SHA if updating existing file
    if (existingFileSha) {
      (filePayload as any).sha = existingFileSha;
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
      console.error(
        "File operation failed:",
        fileOperationResponse.status,
        operationError
      );

      // Try to parse error message from GitHub
      try {
        const errorJson = JSON.parse(operationError);
        return NextResponse.json(
          {
            error: errorJson.message || "Failed to save file to GitHub",
          },
          { status: 500 }
        );
      } catch {
        return NextResponse.json(
          {
            error:
              "Failed to save file to GitHub. Please check your permissions.",
          },
          { status: 500 }
        );
      }
    }

    const result = await fileOperationResponse.json();

    // Return success response with file details
    return NextResponse.json({
      success: true,
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
  } catch (error: any) {
    console.error("GitHub API error:", error);

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
