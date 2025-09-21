import { supabaseAdmin } from "@/lib/supabase";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export type CreditsUser = {
  id: string;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  type: "purchase" | "usage" | "bonus" | "refund";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
};

export async function getOrCreateUserWithCredits(
  req: NextRequest,
  initialCredits = 50,
): Promise<CreditsUser | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub || !token?.login) return null;

    // First check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", token.sub)
      .single();

    if (existingUser) {
      // User exists, just update last login
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", token.sub)
        .select(
          `
          id, login, email, name, avatar_url, credits,
          total_credits_earned, total_credits_spent,
          created_at, updated_at, last_login_at
        `,
        )
        .single();

      if (error) {
        console.error("User update error:", error);
        throw error;
      }

      return data as CreditsUser;
    } else {
      // User does not exist, create with initial credits
      const userData = {
        id: token.sub,
        login: (token.login as string) || token.sub,
        email: token.email as string,
        name: token.name as string,
        avatar_url: token.picture as string,
        credits: initialCredits,
        total_credits_earned: initialCredits,
        total_credits_spent: 0,
        last_login_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert(userData)
        .select(
          `
          id, login, email, name, avatar_url, credits,
          total_credits_earned, total_credits_spent,
          created_at, updated_at, last_login_at
        `,
        )
        .single();

      if (error) {
        console.error("User insert error:", error);
        throw error;
      }

      return data as CreditsUser;
    }
  } catch (e) {
    console.error("credits:getOrCreateUserWithCredits error", e);
    return null;
  }
}

export async function requireCredits(
  req: NextRequest,
  amount = 1,
  featureType:
    | "chatbot"
    | "execute"
    | "ai_execute"
    | "analyze"
    | "generate_docs"
    | "generate_tests" = "chatbot",
  description?: string,
) {
  // Set default descriptions based on feature type if not provided
  if (!description) {
    switch (featureType) {
      case "chatbot":
        description = "AI chat conversation";
        break;
      case "execute":
        description = "Code execution";
        break;
      case "ai_execute":
        description = "AI code execution and analysis";
        break;
      case "analyze":
        description = "Code analysis and review";
        break;
      case "generate_docs":
        description = "Documentation generation";
        break;
      case "generate_tests":
        description = "Test case generation";
        break;
      default:
        description = "AI operation";
    }
  }
  const user = await getOrCreateUserWithCredits(req);
  if (!user) {
    return {
      allowed: false,
      status: 401,
      body: { error: "UNAUTHENTICATED", message: "Please sign in with GitHub" },
    };
  }

  if (user.credits < amount) {
    return {
      allowed: false,
      status: 402,
      body: {
        error: "INSUFFICIENT_CREDITS",
        message: `You need ${amount} credits but only have ${user.credits}`,
      },
    };
  }

  // Use the database function to consume credits atomically
  const { data: result, error } = await supabaseAdmin.rpc("consume_credits", {
    p_user_id: user.id,
    p_amount: amount,
    p_feature_type: featureType,
    p_description: description,
  });

  if (error) {
    console.error("credits:consume error", error);
    return {
      allowed: false,
      status: 500,
      body: { error: "CREDITS_ERROR", message: "Failed to consume credits" },
    };
  }

  // Parse the result
  const resultData = typeof result === "string" ? JSON.parse(result) : result;

  if (!resultData.success) {
    return {
      allowed: false,
      status: 402,
      body: { error: "INSUFFICIENT_CREDITS", message: resultData.error },
    };
  }

  return {
    allowed: true,
    transaction_id: resultData.transaction_id,
    new_balance: resultData.new_balance,
  };
}
