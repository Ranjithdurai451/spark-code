import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserWithCredits } from "@/lib/credits";

export async function GET(req: NextRequest) {
  const user = await getOrCreateUserWithCredits(req);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
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
    },
  });
}
