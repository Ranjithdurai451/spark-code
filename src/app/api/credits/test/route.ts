import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits/index";
import { supabaseAdmin } from "@/lib/database/supabase";

export async function GET(req: NextRequest) {
  try {
    // Test user creation/retrieval
    const user = await getOrCreateUserWithCredits(req);
    if (!user) {
      return NextResponse.json(
        {
          error: "User authentication failed",
          status: "failed",
        },
        { status: 401 },
      );
    }

    // Test database connection
    const { data: tables, error: tableError } = await supabaseAdmin
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["users", "credit_transactions"]);

    if (tableError) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: tableError.message,
          status: "failed",
        },
        { status: 500 },
      );
    }

    // Test credit transactions query
    const { data: transactions, error: txError } = await supabaseAdmin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .limit(5);

    if (txError) {
      return NextResponse.json(
        {
          error: "Transaction query failed",
          details: txError.message,
          status: "failed",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "success",
      user: {
        id: user.id,
        login: user.login,
        credits: user.credits,
        created_at: user.created_at,
      },
      database: {
        tables_found: tables?.length || 0,
        tables: tables?.map((t) => t.table_name) || [],
      },
      transactions: {
        count: transactions?.length || 0,
        sample: transactions?.slice(0, 2) || [],
      },
      message: "Database and user system working correctly!",
    });
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        status: "failed",
      },
      { status: 500 },
    );
  }
}
