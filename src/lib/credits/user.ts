import { supabaseAdmin } from "@/lib/database/supabase";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import type { CreditsUser } from "./types";

export async function getOrCreateUserWithCredits(
  req: NextRequest,
  initialCredits = 50,
): Promise<CreditsUser | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub || !token?.login) return null;

    const now = new Date().toISOString();

    // First check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", token.sub)
      .single();

    if (existingUser) {
      // User exists, just update last login
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ last_login_at: now, updated_at: now })
        .eq("id", token.sub)
        .select(
          `
          id, login, email, name, avatar_url, credits,
          total_credits_earned, total_credits_spent,
          created_at, updated_at, last_login_at
        `,
        )
        .single();

      if (error) {
        console.error("User update error:", error);
        throw error;
      }

      return data as CreditsUser;
    } else {
      // User does not exist, create with initial credits
      const userData = {
        id: token.sub,
        login: (token.login as string) || token.sub,
        email: token.email as string,
        name: token.name as string,
        avatar_url: token.picture as string,
        credits: initialCredits,
        total_credits_earned: initialCredits,
        total_credits_spent: 0,
        last_login_at: now,
        updated_at: now,
      };

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert(userData)
        .select(
          `
          id, login, email, name, avatar_url, credits,
          total_credits_earned, total_credits_spent,
          created_at, updated_at, last_login_at
        `,
        )
        .single();

      if (error) {
        console.error("User insert error:", error);
        throw error;
      }

      return data as CreditsUser;
    }
  } catch (e) {
    console.error("credits:getOrCreateUserWithCredits error", e);
    return null;
  }
}
