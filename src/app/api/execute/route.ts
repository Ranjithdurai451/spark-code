// app/api/execute/route.ts
import { getApiKeys } from "@/lib/getApiKeys";
import { NextRequest, NextResponse } from "next/server";

const LANGUAGE_MAP: Record<string, number> = {
  python: 71,
  javascript: 63,
  cpp: 54,
  java: 62,
  c: 50,
  go: 60,
  rust: 73,
  typescript: 74,
};

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";
let JUDGE0_KEY;

export async function POST(req: NextRequest) {
  try {
    const {
      code,
      language,
      input,
      judge0ApiKey: clientJudge0ApiKey,
    } = await req.json();
    const keyInfo = await getApiKeys(req);
    const judge0Key =
      keyInfo.mode === "local" ? clientJudge0ApiKey : keyInfo.judge0Key;

    // Check if key available
    if (!judge0Key) {
      return Response.json(
        {
          error: "NO_API_KEY",
          message: keyInfo.error || "Gemini API key required",
          mode: keyInfo.mode,
        },
        { status: 401 }
      );
    }
    JUDGE0_KEY = judge0Key;

    // Validate inputs
    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 }
      );
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${language}`,
          supportedLanguages: Object.keys(LANGUAGE_MAP),
        },
        { status: 400 }
      );
    }

    // Execute code
    const result = await executeCode({
      code,
      language,

      languageId,
      input: input || "",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function forceMainClass(src: string): string {
  const re = /\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/;
  return re.test(src)
    ? src.replace(re, (_, name) =>
        name === "Main" ? `public class Main` : `public class Main`
      )
    : src; // no public class found → leave unchanged
}
async function executeCode({
  code,
  languageId,
  language,
  input,
}: {
  language: string;
  code: string;
  languageId: number;
  input: string;
}) {
  const patchedCode =
    language.toLowerCase() === "java" ? forceMainClass(code) : code;
  const response = await fetch(`${JUDGE0_URL}?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": JUDGE0_KEY!,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
    body: JSON.stringify({
      source_code: patchedCode,
      language_id: languageId,
      stdin: input,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Judge0 API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // Format the output
  let output = data.stdout || "";

  if (data.stderr) {
    output += output ? `\n\nErrors:\n${data.stderr}` : data.stderr;
  }

  if (data.compile_output) {
    output += output
      ? `\n\nCompile Output:\n${data.compile_output}`
      : data.compile_output;
  }

  if (!output && data.message) {
    output = data.message;
  }

  if (!output) {
    output = "No output generated";
  }

  return {
    output,
    status: data.status?.description || "completed",
    time: data.time,
    memory: data.memory,
    exitCode: data.exit_code,
  };
}
