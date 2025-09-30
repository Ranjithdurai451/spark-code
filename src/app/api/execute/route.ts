// app/api/execute/route.ts
import { NextRequest } from "next/server";
import { requireCredits } from "@/lib/credits/index";
import { executeOnJudge0 } from "@/lib/services/judge0";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";

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
  const startTime = Date.now();

  try {
    logger.apiRequest("POST", req.url);

    const credit = await requireCredits(req, 2, "execute");
    if (!credit.allowed) {
      logger.apiResponse(
        "POST",
        req.url,
        credit.status || 402,
        Date.now() - startTime,
        {
          error: "insufficient_credits",
        },
      );
      return new Response(JSON.stringify(credit.body), {
        status: credit.status || 402,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { code, language, input } = await req.json();

    // Validate inputs
    if (!code || !language) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "missing_required_fields",
      });
      throw APIError.create(
        ErrorCode.MISSING_REQUIRED_FIELD,
        {},
        "Code and language are required",
      );
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "unsupported_language",
        language,
      });
      throw APIError.create(
        ErrorCode.UNSUPPORTED_LANGUAGE,
        { language, supported: Object.keys(LANGUAGE_MAP) },
        `Unsupported language: ${language}`,
      );
    }

    // Execute code
    const result = await executeCode({
      code,
      language,

      languageId,
      input: input || "",
    });

    logger.apiResponse("POST", req.url, 200, Date.now() - startTime, {
      language,
      hasOutput: !!result.output,
    });

    return createSuccessResponse(result, {
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.apiResponse(
      "POST",
      req.url,
      error instanceof APIError ? error.statusCode : 500,
      Date.now() - startTime,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );

    return createErrorResponse(error, {
      processingTime: Date.now() - startTime,
    });
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
