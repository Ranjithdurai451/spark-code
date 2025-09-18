import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("price");

    if (error) {
      console.error("Failed to fetch plans:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Plans API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
