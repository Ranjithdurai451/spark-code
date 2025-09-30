import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { withAuth } from "@/lib/middleware/auth";
import { logger } from "@/lib/logging/logger";

/**
 * Get current user's credit information
 * GET /api/credits
 */
export const GET = withAuth(async (user, req) => {
  const startTime = Date.now();

  try {
    logger.apiRequest("GET", req.url, { userId: user.id });

    // Return user credit information
    const userData = {
      id: user.id,
      login: user.login,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      credits: user.credits,
      total_credits_earned: user.total_credits_earned,
      total_credits_spent: user.total_credits_spent,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    };

    logger.apiResponse("GET", req.url, 200, Date.now() - startTime, {
      userId: user.id,
      credits: user.credits,
    });

    return createSuccessResponse(
      { user: userData },
      { processingTime: Date.now() - startTime },
    );
  } catch (error) {
    logger.apiResponse("GET", req.url, 500, Date.now() - startTime, {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createErrorResponse(error, {
      processingTime: Date.now() - startTime,
    });
  }
});
