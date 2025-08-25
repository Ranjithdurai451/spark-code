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

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;

    const {
      geminiKey,
      judge0Key,
      skipVerification = false, // NEW: Add skip parameter
    } = await req.json();

    if (!geminiKey || !judge0Key) {
      return NextResponse.json(
        { success: false, error: "Both API keys are required" },
        { status: 400 }
      );
    }

    // Basic key format validation
    if (typeof geminiKey !== "string" || typeof judge0Key !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid key format" },
        { status: 400 }
      );
    }

    console.log(
      `🔍 ${skipVerification ? "Migrating" : "Validating"} API keys - ${isAuthenticated ? "Secure" : "Local"} mode`
    );

    // UPDATED: Skip validation if requested
    let geminiValid = true;
    let judge0Valid = true;

    if (!skipVerification) {
      // Only validate if not skipping
      const validationPromises = [
        validateGeminiKey(geminiKey.trim()),
        validateJudge0Key(judge0Key.trim()),
      ];

      const timeoutPromise = new Promise<[boolean, boolean]>((_, reject) =>
        setTimeout(() => reject(new Error("Validation timeout")), 15000)
      );

      try {
        [geminiValid, judge0Valid] = (await Promise.race([
          Promise.all(validationPromises),
          timeoutPromise,
        ])) as [boolean, boolean];
      } catch (err) {
        console.error("Validation timeout or error:", err);
        return NextResponse.json(
          { success: false, error: "Validation timeout or network error" },
          { status: 408 }
        );
      }

      const errors: { gemini?: string; judge0?: string } = {};
      if (!geminiValid)
        errors.gemini =
          "Invalid Gemini API key. Please check your key and try again.";
      if (!judge0Valid)
        errors.judge0 =
          "Invalid Judge0 API key. Please check your RapidAPI key and try again.";

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ success: false, errors }, { status: 400 });
      }
    }

    if (isAuthenticated) {
      // SECURE MODE: Encrypt and store in httpOnly session cookie
      const userId = token.sub as string;

      const encryptedGemini = encryptKey(geminiKey.trim(), userId);
      const encryptedJudge0 = encryptKey(judge0Key.trim(), userId);

      const cookieStore = cookies();
      (await cookieStore).set(
        "encrypted-keys",
        JSON.stringify({
          gemini: encryptedGemini,
          judge0: encryptedJudge0,
          userId,
          timestamp: Date.now(),
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: "/",
        }
      );

      console.log(
        `🔒 Keys ${skipVerification ? "migrated" : "encrypted"} and stored securely for user: ${token.login}`
      );

      return NextResponse.json({
        success: true,
        mode: "secure",
        message: skipVerification
          ? "Keys migrated to secure storage successfully"
          : "Keys encrypted with AES-256-GCM and stored securely in your session",
      });
    } else {
      // LOCAL MODE: Just validate, let client handle storage
      console.log("📱 Local mode: Keys validated but not stored server-side");

      return NextResponse.json({
        success: true,
        mode: "local",
        message: "Keys validated - store locally at your own risk",
      });
    }
  } catch (error: any) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during validation" },
      { status: 500 }
    );
  }
}
