import { NextRequest } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits/index";
import { supabaseAdmin } from "@/lib/database/supabase";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { createSuccessResponse } from "@/lib/responses/apiResponse";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { logger } from "@/lib/logging/logger";

interface CreateOrderRequest {
  planId: string;
  amount: number;
  credits: number;
}

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();

  logger.apiRequest(req.method, req.url, { requestId });

  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      logger.error("Razorpay environment variables not configured", {
        requestId,
      });
      throw APIError.create(ErrorCode.CONFIGURATION_ERROR, {
        missingVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
      });
    }

    const { planId }: CreateOrderRequest = await req.json();

    // Validate user
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      logger.warn("Unauthenticated user attempted to create order", {
        requestId,
      });
      throw APIError.create(ErrorCode.UNAUTHENTICATED);
    }

    // Validate and get plan details from database
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      logger.warn("Invalid plan requested", { requestId, planId, planError });
      throw APIError.create(ErrorCode.RESOURCE_NOT_FOUND, { planId });
    }

    const amount = plan.price;
    const credits = plan.credits;

    // Create Razorpay order
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to paisa
        currency: "INR",
        receipt: `rcpt_${user.id}_${Date.now()}`,
        notes: {
          userId: user.id,
          planId,
          credits,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      logger.error("Razorpay order creation failed", {
        requestId,
        status: razorpayResponse.status,
        errorText,
        userId: user.id,
        planId,
      });
      throw APIError.create(ErrorCode.PAYMENT_ERROR, {
        razorpayStatus: razorpayResponse.status,
        razorpayError: errorText,
      });
    }

    const orderData = await razorpayResponse.json();

    const processingTime = Date.now() - startTime;
    logger.apiResponse(req.method, req.url, 200, processingTime, {
      requestId,
      userId: user.id,
      planId,
      orderId: orderData.id,
    });

    return createSuccessResponse(
      {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
      },
      { requestId },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("Create order error", { requestId }, error as Error);
    logger.apiResponse(req.method, req.url, 500, processingTime, { requestId });

    return createErrorResponse(error, { requestId });
  }
}
