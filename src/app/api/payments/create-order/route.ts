import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits";
import { supabaseAdmin } from "@/lib/supabase";

interface CreateOrderRequest {
  planId: string;
  amount: number;
  credits: number;
}

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay environment variables not configured");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 },
      );
    }

    const { planId }: CreateOrderRequest = await req.json();

    // Validate user
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // Validate and get plan details from database
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
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
      console.error(
        "Razorpay order creation failed:",
        await razorpayResponse.text(),
      );
      return NextResponse.json(
        { error: "Failed to create payment order" },
        { status: 500 },
      );
    }

    const orderData = await razorpayResponse.json();

    return NextResponse.json({
      id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
