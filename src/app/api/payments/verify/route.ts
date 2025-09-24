import { NextRequest } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { APIError, createErrorResponse } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { logger } from "@/lib/logging/logger";

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest(req.method, req.url);

    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_SECRET) {
      logger.error("Razorpay environment variables not configured", {
        url: req.url,
        method: req.method,
      });
      throw APIError.create(ErrorCode.CONFIGURATION_ERROR, {
        missingEnvVar: "RAZORPAY_KEY_SECRET",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    }: VerifyPaymentRequest = await req.json();

    // Validate user
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      throw APIError.create(ErrorCode.UNAUTHENTICATED);
    }

    // Check for duplicate payment processing
    const { data: existingPayment, error: checkError } = await supabaseAdmin
      .from("credit_additions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment) {
      throw APIError.create(ErrorCode.RESOURCE_ALREADY_EXISTS, {
        razorpay_payment_id,
        message: "Payment already processed",
      });
    }

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      logger.warn("Payment signature verification failed", {
        userId: user.id,
        razorpay_order_id,
        razorpay_payment_id,
      });
      throw APIError.create(ErrorCode.PAYMENT_ERROR, {
        razorpay_order_id,
        razorpay_payment_id,
        message: "Payment verification failed",
      });
    }

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      throw APIError.create(ErrorCode.INVALID_VALUE, {
        planId,
        message: "Invalid plan",
      });
    }

    // Add credits using the database function
    const { data: addResult, error: addError } = await supabaseAdmin.rpc(
      "add_credits",
      {
        p_user_id: user.id,
        p_amount: plan.credits,
        p_type: "purchase",
        p_description: `Purchased ${plan.credits} credits (${plan.name} plan)`,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
      },
    );

    if (addError) {
      logger.error("Failed to add credits via database function", {
        userId: user.id,
        razorpay_order_id,
        razorpay_payment_id,
        error: addError,
      });
      throw APIError.create(ErrorCode.OPERATION_FAILED, {
        razorpay_order_id,
        razorpay_payment_id,
        dbError: addError,
        message: "Failed to add credits",
      });
    }

    // Parse the result
    const resultData =
      typeof addResult === "string" ? JSON.parse(addResult) : addResult;

    if (!resultData.success) {
      logger.error("Add credits function returned failure", {
        userId: user.id,
        razorpay_order_id,
        razorpay_payment_id,
        resultData,
      });
      throw APIError.create(ErrorCode.OPERATION_FAILED, {
        razorpay_order_id,
        razorpay_payment_id,
        resultData,
        message: "Failed to add credits",
      });
    }

    logger.apiResponse(req.method, req.url, 200, Date.now() - startTime, {
      userId: user.id,
      creditsAdded: plan.credits,
      planId,
    });

    return createSuccessResponse({
      credits: plan.credits,
      plan: plan.name,
    });
  } catch (error) {
    logger.apiResponse(
      req.method,
      req.url,
      error instanceof APIError ? error.statusCode : 500,
      Date.now() - startTime,
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    );

    return createErrorResponse(error);
  }
}
