// app/api/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireCredits } from "@/lib/credits";
import { executeOnJudge0 } from "@/lib/judge0";

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

// BYOK removed: keys are sourced from env via executeOnJudge0

export async function POST(req: NextRequest) {
  try {
    const credit = await requireCredits(req, 2, "execute");
    if (!credit.allowed) {
      return NextResponse.json(credit.body, { status: credit.status });
    }
    const { code, language, input } = await req.json();

    // Validate inputs
    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 },
      );
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${language}`,
          supportedLanguages: Object.keys(LANGUAGE_MAP),
        },
        { status: 400 },
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
      { status: 500 },
    );
  }
}

function forceMainClass(src: string): string {
  const re = /\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/;
  return re.test(src)
    ? src.replace(re, (_, name) =>
        name === "Main" ? `public class Main` : `public class Main`,
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
  const data = await executeOnJudge0({
    code: patchedCode,
    languageId,
    stdin: input,
  });

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
