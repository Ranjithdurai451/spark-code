import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

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
      console.error(
        "Failed to fetch credit history:",
        additionsResult.error || consumptionResult.error,
      );
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 },
      );
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

    return NextResponse.json(combinedHistory.slice(0, 50));
  } catch (error) {
    console.error("Credit history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
