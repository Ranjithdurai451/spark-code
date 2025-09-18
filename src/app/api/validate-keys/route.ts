// /api/validate-keys/route.ts (Updated)
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { encryptKey } from "@/lib/apiKeyCrypto";

async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Gemini validation error:", error);
    return false;
  }
}

async function validateJudge0Key(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://judge0-ce.p.rapidapi.com/languages", {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (error) {
    console.error("Judge0 validation error:", error);
    return false;
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Endpoint disabled: BYOK removed" },
    { status: 410 }
  );
}
