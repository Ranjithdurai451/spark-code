import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ 
        error: "Missing authorization token" 
      }, { status: 401 });
    }

    const { repo }: { repo: string } = await req.json();
    
    if (!repo?.trim()) {
      return NextResponse.json({ 
        error: "Repository name is required" 
      }, { status: 400 });
    }

    console.log(`📡 Fetching tree for repo: ${repo}`);

    // Step 1: Get user info and rate limit status
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { 
        Authorization: `Bearer ${token}`,
        "User-Agent": "SparkCode-App/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ User fetch failed:", userResponse.status, errorText);
      
      return NextResponse.json({ 
        error: userResponse.status === 401 
          ? "Invalid or expired GitHub token" 
          : `GitHub API error: ${userResponse.status}`,
        details: errorText,
        rateLimitRemaining: userResponse.headers.get('x-ratelimit-remaining')
      }, { status: userResponse.status });
    }

    const user = await userResponse.json();
    const repoFullName = `${user.login}/${repo}`;
    
    console.log(`👤 User: ${user.login}, Rate limit remaining: ${userResponse.headers.get('x-ratelimit-remaining')}`);

    // Step 2: Check repository access
    const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "User-Agent": "SparkCode-App/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.error("❌ Repository fetch failed:", repoResponse.status, errorText);
      
      return NextResponse.json({ 
        error: repoResponse.status === 404 
          ? `Repository '${repoFullName}' not found or access denied`
          : `Cannot access repository: ${repoResponse.status}`,
        details: errorText
      }, { status: repoResponse.status });
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || "main";
    
    console.log(`📁 Repository: ${repoFullName}, Branch: ${defaultBranch}, Size: ${repoData.size}KB`);

    // Step 3: Fetch repository tree with fallbacks
    const treeUrls = [
      `https://api.github.com/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`,
      `https://api.github.com/repos/${repoFullName}/contents`, // Fallback for small repos
    ];

    let treeData: any = null;
    let method = "tree";

    for (const [index, treeUrl] of treeUrls.entries()) {
      try {
        console.log(`🌳 Trying method ${index + 1}: ${index === 0 ? 'git/trees' : 'contents'}`);
        
        const treeResponse = await fetch(treeUrl, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "User-Agent": "SparkCode-App/1.0",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }
        });

        if (treeResponse.ok) {
          const data = await treeResponse.json();
          
          if (index === 0) {
            // Git trees API
            treeData = data.tree || [];
            method = "tree";
          } else {
            // Contents API - need to flatten
            treeData = await flattenContentsRecursively(repoFullName, token, "", data);
            method = "contents";
          }
          
          console.log(`✅ Success with method ${index + 1}, found ${treeData.length} items`);
          break;
        } else {
          console.warn(`⚠️ Method ${index + 1} failed:`, treeResponse.status);
        }
      } catch (error: any) {
        console.warn(`⚠️ Method ${index + 1} error:`, error.message);
        continue;
      }
    }

    if (!treeData) {
      return NextResponse.json({ 
        error: "Failed to fetch repository tree with all methods",
        suggestion: "Try a smaller repository or check repository permissions"
      }, { status: 500 });
    }

    // Filter and normalize data
    const normalizedFiles = treeData
      .filter((item: any) => item.path && item.type)
      .map((item: any) => ({
        path: item.path,
        type: item.type === "dir" ? "tree" : item.type, // Normalize 'dir' to 'tree'
        sha: item.sha,
        size: item.size || 0,
        url: item.url
      }));

    console.log(`📊 Returning ${normalizedFiles.length} files (method: ${method})`);

    return NextResponse.json({
      success: true,
      repository: repoFullName,
      branch: defaultBranch,
      files: normalizedFiles,
      count: normalizedFiles.length,
      method: method,
      rateLimitRemaining: userResponse.headers.get('x-ratelimit-remaining')
    });

  } catch (error: any) {
    console.error("💥 Unexpected error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to recursively fetch contents (fallback method)
async function flattenContentsRecursively(
  repoFullName: string, 
  token: string, 
  path: string = "", 
  items?: any[]
): Promise<any[]> {
  let allItems: any[] = [];
  
  // If items not provided, fetch them
  if (!items) {
    const url = path 
      ? `https://api.github.com/repos/${repoFullName}/contents/${path}`
      : `https://api.github.com/repos/${repoFullName}/contents`;
      
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "User-Agent": "SparkCode-App/1.0"
      }
    });
    
    if (!response.ok) return [];
    items = await response.json();
  }

  if (!items) return allItems; // Defensive: if items is still undefined, return empty

  for (const item of items) {
    allItems.push(item);

    // Recursively fetch subdirectories (but limit depth to avoid rate limits)
    if (item.type === "dir" && path.split('/').length < 3) {
      try {
        const subItems = await flattenContentsRecursively(repoFullName, token, item.path);
        allItems.push(...subItems);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch subdirectory: ${item.path}`);
      }
    }
  }
  
  return allItems;
}
