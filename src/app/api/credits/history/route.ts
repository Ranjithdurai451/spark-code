import { NextRequest } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits/index";
import { supabaseAdmin } from "@/lib/database/supabase";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { logger } from "@/lib/logging/logger";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const method = req.method;
  const url = req.nextUrl.pathname;
  let userId: string | undefined;

  logger.apiRequest(method, url);

  try {
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      throw APIError.create(ErrorCode.UNAUTHENTICATED);
    }
    userId = user.id;

    // Fetch additions and consumption separately
    const [additionsResult, consumptionResult] = await Promise.all([
      supabaseAdmin
        .from("credit_additions")
        .select(
          `
           id, user_id, type, amount, description, razorpay_order_id, razorpay_payment_id,
           metadata, created_at
         `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),

      supabaseAdmin
        .from("credit_consumption")
        .select(
          `
           id, user_id, feature_type, amount, description,
           metadata, created_at
         `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    if (additionsResult.error || consumptionResult.error) {
      logger.error("Failed to fetch credit history", {
        userId,
        additionsError: additionsResult.error,
        consumptionError: consumptionResult.error,
      });
      throw APIError.create(ErrorCode.DATABASE_ERROR, {
        additionsError: additionsResult.error,
        consumptionError: consumptionResult.error,
      });
    }

    // Combine and sort by created_at
    const combinedHistory = [
      ...(additionsResult.data || []).map((item) => ({
        ...item,
        category: "addition" as const,
        type: item.type,
      })),
      ...(consumptionResult.data || []).map((item) => ({
        ...item,
        category: "consumption" as const,
        type: item.feature_type,
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const processingTime = Date.now() - startTime;
    logger.apiResponse(method, url, 200, processingTime, { userId });
    return createSuccessResponse(combinedHistory.slice(0, 50), {
      processingTime,
      userId,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const statusCode = error instanceof APIError ? error.statusCode : 500;
    logger.error(
      "Credit history error",
      {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      error instanceof Error ? error : undefined,
    );
    logger.apiResponse(method, url, statusCode, processingTime, { userId });
    return createErrorResponse(error, {
      processingTime,
      userId,
    });
  }
}
