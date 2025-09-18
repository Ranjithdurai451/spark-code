import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
}

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay environment variables not configured");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 },
      );
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
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // Check for duplicate payment processing
    const { data: existingPayment, error: checkError } = await supabaseAdmin
      .from("credit_additions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 400 },
      );
    }

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
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
      console.error("Failed to add credits:", addError);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 },
      );
    }

    // Parse the result
    const resultData =
      typeof addResult === "string" ? JSON.parse(addResult) : addResult;

    if (!resultData.success) {
      console.error("Add credits failed:", resultData.error);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, credits: plan.credits });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
