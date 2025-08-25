import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type FileRequestBody = {
  repo: string;
  path: string;
};

export async function POST(req: NextRequest) {
  try {
    // Get NextAuth session token instead of Authorization header
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log("🔍 File fetch token check:", !!token?.accessToken); // Debug log

    if (!token?.accessToken) {
      console.error("❌ No access token found for file fetch");
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in with GitHub again.",
        },
        { status: 401 }
      );
    }

    const githubToken = token.accessToken as string;

    // Parse request body
    let body: FileRequestBody;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        { status: 400 }
      );
    }

    const { repo, path } = body;

    if (!repo?.trim() || !path?.trim()) {
      return NextResponse.json(
        {
          error: "Repository and file path are required",
        },
        { status: 400 }
      );
    }

    console.log("📄 Fetching file:", { repo, path });

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
      console.error("❌ GitHub user fetch failed:", userResponse.status);
      return NextResponse.json(
        {
          error: "GitHub authentication failed. Please reconnect in Settings.",
        },
        { status: 401 }
      );
    }

    const user = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;

    console.log("👤 User:", user.login, "Fetching from:", repoFullName);

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
      console.error("❌ File fetch failed:", fileResponse.status);

      let errorMessage = "Failed to fetch file content";

      if (fileResponse.status === 404) {
        errorMessage = `File not found: ${path}`;
      } else if (fileResponse.status === 403) {
        errorMessage = "Access denied. Check repository permissions.";
      } else if (fileResponse.status === 401) {
        errorMessage = "GitHub authentication expired. Please sign in again.";
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: fileResponse.status }
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
        console.error("❌ Base64 decode error:", decodeError);
        return NextResponse.json(
          {
            error:
              "Failed to decode file content. File may be binary or corrupted.",
          },
          { status: 500 }
        );
      }
    } else {
      // Handle large files or other cases
      if (fileData.size > 1000000) {
        // 1MB limit
        return NextResponse.json(
          {
            error:
              "File too large to import (>1MB). Please use a smaller file.",
          },
          { status: 413 }
        );
      }

      return NextResponse.json(
        {
          error: "File content not available or file is binary.",
        },
        { status: 422 }
      );
    }

    console.log("✅ File fetched successfully:", path);

    return NextResponse.json({
      success: true,
      content,
      name: fileData.name,
      path: fileData.path,
      size: fileData.size,
      sha: fileData.sha,
    });
  } catch (error: any) {
    console.error("💥 GitHub file fetch error:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
