import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";

/**
 * Get all active plans
 * GET /api/plans
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest("GET", req.url);

    const { data: plans, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("price");

    if (error) {
      logger.error("Failed to fetch plans from database", {
        error: error.message,
        code: error.code,
      });

      throw APIError.create(
        ErrorCode.DATABASE_ERROR,
        { originalError: error.message },
        "Failed to fetch plans",
      );
    }

    logger.apiResponse("GET", req.url, 200, Date.now() - startTime, {
      planCount: plans?.length || 0,
    });

    return createSuccessResponse(
      { plans: plans || [] },
      { processingTime: Date.now() - startTime },
    );
  } catch (error) {
    logger.apiResponse(
      "GET",
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
