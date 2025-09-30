import { supabaseAdmin } from "@/lib/database/supabase";
import { NextRequest } from "next/server";
import { getOrCreateUserWithCredits } from "./user";

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
