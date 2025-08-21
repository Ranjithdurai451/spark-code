import { NextRequest, NextResponse } from "next/server";

type FileRequestBody = {
  repo: string;
  path: string;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ 
        error: "Missing authorization token" 
      }, { status: 401 });
    }

    const { repo, path }: FileRequestBody = await req.json();
    
    if (!repo?.trim() || !path?.trim()) {
      return NextResponse.json({ 
        error: "Repository and path are required" 
      }, { status: 400 });
    }

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { 
        Authorization: `token ${token}`,
        "User-Agent": "SparkCode-App/1.0"
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({ 
        error: "Invalid GitHub token" 
      }, { status: 401 });
    }

    const user = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;
    
    // Fetch file content
    const fileUrl = `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(path)}`;
    
    const fileResponse = await fetch(fileUrl, {
      headers: { 
        Authorization: `token ${token}`,
        "User-Agent": "SparkCode-App/1.0"
      }
    });

    if (!fileResponse.ok) {
      return NextResponse.json({ 
        error: "Failed to fetch file content" 
      }, { status: 500 });
    }

    const fileData = await fileResponse.json();
    
    // Decode base64 content
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');

    return NextResponse.json({
      success: true,
      content,
      name: fileData.name,
      path: fileData.path,
      size: fileData.size
    });

  } catch (error: any) {
    console.error("GitHub file fetch error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
