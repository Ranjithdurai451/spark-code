/**
 * Credit checking and deduction middleware
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase";
import { APIError } from "../errors/errorHandler";
import { ErrorCode } from "../errors/errorCodes";
import { createErrorResponse } from "../responses/errorResponse";
import { logger } from "../logging/logger";
import { User } from "@/types/api";

export interface CreditCheckResult {
  allowed: boolean;
  available: number;
  required: number;
  shortfall?: number;
  transactionId?: string;
}

/**
 * Check if user has sufficient credits (optimized with single query)
 */
export async function checkUserCredits(
  userId: string,
  requiredCredits: number,
): Promise<CreditCheckResult> {
  try {
    // Use a single optimized query to get credits and check
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error) {
      logger.error("Failed to fetch user credits", {
        userId,
        error: error.message,
      });
      throw APIError.create(ErrorCode.DATABASE_ERROR, {
        userId,
        originalError: error.message,
      });
    }

    if (!data) {
      throw APIError.create(ErrorCode.RESOURCE_NOT_FOUND, {
        userId,
        resource: "user",
      });
    }

    const availableCredits = data.credits || 0;
    const allowed = availableCredits >= requiredCredits;
    const shortfall = allowed ? 0 : requiredCredits - availableCredits;

    logger.debug("Credit check completed", {
      userId,
      available: availableCredits,
      required: requiredCredits,
      allowed,
      shortfall,
    });

    return {
      allowed,
      available: availableCredits,
      required: requiredCredits,
      shortfall: shortfall > 0 ? shortfall : undefined,
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error(
      "Credit check failed",
      { userId, requiredCredits },
      error instanceof Error ? error : undefined,
    );
    throw APIError.create(ErrorCode.INTERNAL_ERROR, {
      userId,
      requiredCredits,
      originalError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Deduct credits from user account (optimized with database function)
 */
export async function deductCredits(
  userId: string,
  amount: number,
  featureType: string,
  description?: string,
): Promise<string> {
  try {
    const { data: result, error } = await supabaseAdmin.rpc("consume_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_feature_type: featureType,
      p_description: description || `Used ${amount} credits for ${featureType}`,
    });

    if (error) {
      logger.error("Failed to deduct credits", {
        userId,
        amount,
        featureType,
        error: error.message,
      });
      throw APIError.create(ErrorCode.DATABASE_ERROR, {
        userId,
        amount,
        featureType,
        originalError: error.message,
      });
    }

    // Parse the result
    const resultData = typeof result === "string" ? JSON.parse(result) : result;

    if (!resultData.success) {
      logger.warn("Credit deduction failed", {
        userId,
        amount,
        featureType,
        error: resultData.error,
      });

      throw APIError.create(
        ErrorCode.INSUFFICIENT_CREDITS,
        {
          userId,
          amount,
          featureType,
          available: resultData.available_credits,
        },
        resultData.error || "Insufficient credits",
      );
    }

    const transactionId = resultData.transaction_id;

    logger.creditTransaction(userId, "deduction", amount, featureType, {
      transactionId,
      remainingCredits: resultData.new_balance,
    });

    return transactionId;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error(
      "Credit deduction failed",
      {
        userId,
        amount,
        featureType,
      },
      error instanceof Error ? error : undefined,
    );

    throw APIError.create(ErrorCode.INTERNAL_ERROR, {
      userId,
      amount,
      featureType,
      originalError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Add credits to user account (for purchases, bonuses, etc.) - optimized
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "purchase" | "bonus" | "refund",
  description?: string,
): Promise<string> {
  try {
    const { data: result, error } = await supabaseAdmin.rpc("add_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description || `Added ${amount} credits (${type})`,
    });

    if (error) {
      logger.error("Failed to add credits", {
        userId,
        amount,
        type,
        error: error.message,
      });
      throw APIError.create(ErrorCode.DATABASE_ERROR, {
        userId,
        amount,
        type,
        originalError: error.message,
      });
    }

    // Parse the result
    const resultData = typeof result === "string" ? JSON.parse(result) : result;

    if (!resultData.success) {
      logger.warn("Credit addition failed", {
        userId,
        amount,
        type,
        error: resultData.error,
      });

      throw APIError.create(
        ErrorCode.OPERATION_FAILED,
        {
          userId,
          amount,
          type,
          error: resultData.error,
        },
        resultData.error || "Failed to add credits",
      );
    }

    const transactionId = resultData.transaction_id;

    logger.creditTransaction(userId, "addition", amount, type, {
      transactionId,
      newTotalCredits: resultData.new_balance,
    });

    return transactionId;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error(
      "Credit addition failed",
      {
        userId,
        amount,
        type,
      },
      error instanceof Error ? error : undefined,
    );

    throw APIError.create(ErrorCode.INTERNAL_ERROR, {
      userId,
      amount,
      type,
      originalError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get user's credit balance (optimized)
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error) {
      logger.error("Failed to get user credits", {
        userId,
        error: error.message,
      });
      throw APIError.create(ErrorCode.DATABASE_ERROR, {
        userId,
        originalError: error.message,
      });
    }

    return data?.credits || 0;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error(
      "Failed to get user credits",
      { userId },
      error instanceof Error ? error : undefined,
    );
    throw APIError.create(ErrorCode.INTERNAL_ERROR, {
      userId,
      originalError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Higher-order function to wrap route handlers with credit checking
 */
export function withCredits<T extends any[]>(
  creditCost: number,
  featureType: string,
  handler: (user: User, req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    skipCheck?: boolean;
    allowNegative?: boolean;
  } = {},
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    // This middleware expects the user to be authenticated first
    // It should be used in combination with withAuth
    throw new Error(
      "withCredits should be used with withAuth. Use withAuthAndCredits instead.",
    );
  };
}

/**
 * Combined authentication and credit checking middleware
 */
export function withAuthAndCredits<T extends any[]>(
  creditCost: number,
  featureType: string,
  handler: (user: User, req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    skipCheck?: boolean;
    allowNegative?: boolean;
  } = {},
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // Import here to avoid circular dependencies
      const { requireAuth } = await import("../middleware/auth");

      // Authenticate user
      const user = await requireAuth(req);

      // Check credits if not skipped
      if (!options.skipCheck) {
        const creditCheck = await checkUserCredits(user.id, creditCost);

        if (!creditCheck.allowed) {
          logger.warn("Insufficient credits for operation", {
            userId: user.id,
            required: creditCost,
            available: creditCheck.available,
            featureType,
          });

          throw APIError.create(ErrorCode.INSUFFICIENT_CREDITS, {
            required: creditCost,
            available: creditCheck.available,
            shortfall: creditCheck.shortfall,
            featureType,
          });
        }

        // Deduct credits
        const transactionId = await deductCredits(
          user.id,
          creditCost,
          featureType,
        );

        logger.apiRequest(req.method, req.url, {
          userId: user.id,
          creditsDeducted: creditCost,
          featureType,
          transactionId,
        });
      }

      // Execute handler
      const response = await handler(user, req, ...args);

      logger.apiResponse(
        req.method,
        req.url,
        response.status,
        Date.now() - startTime,
        {
          userId: user.id,
          creditsDeducted: options.skipCheck ? 0 : creditCost,
          featureType,
        },
      );

      return response;
    } catch (error) {
      logger.apiResponse(
        req.method,
        req.url,
        error instanceof APIError ? error.statusCode : 500,
        Date.now() - startTime,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          featureType,
        },
      );

      if (error instanceof APIError) {
        return createErrorResponse(error, {
          processingTime: Date.now() - startTime,
        });
      }

      // Handle unexpected errors
      const apiError = APIError.create(ErrorCode.INTERNAL_ERROR, {
        originalError: error instanceof Error ? error.message : "Unknown error",
        featureType,
      });

      return createErrorResponse(apiError, {
        processingTime: Date.now() - startTime,
      });
    }
  };
}

/**
 * Get credit cost for a feature type
 */
export function getCreditCost(featureType: string): number {
  const creditCosts: Record<string, number> = {
    ai_execute: 3,
    analyze: 1,
    chatbot: 1,
    execute: 2,
    generate_docs: 1,
    generate_tests: 1,
    github_file: 1,
    github_save: 2,
    github_tree: 1,
  };

  return creditCosts[featureType] || 1; // Default to 1 credit
}

/**
 * Check if user can afford an operation without deducting credits
 */
export async function canAffordOperation(
  userId: string,
  featureType: string,
): Promise<CreditCheckResult> {
  const cost = getCreditCost(featureType);
  return await checkUserCredits(userId, cost);
}
