import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { supabaseAdmin } from "@/lib/database/supabase";

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // Add repo scope for write access to repositories
          scope: "read:user user:email public_repo ",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and user info to the token right after signin
      if (account && profile) {
        token.accessToken = account.access_token;
        token.login = (profile as { login?: string })?.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.login = token.login;
        // Get user credits from database
        try {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("credits")
            .eq("id", token.sub)
            .single();

          if (userData) {
            session.user.credits = userData.credits;
          }
        } catch (error) {
          console.error("Failed to get user credits:", error);
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Create user in database when signing in (only if they don't exist)
      try {
        if (account?.provider === "github" && profile) {
          // Check if user already exists
          const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("id", user.id)
            .single();

          if (!existingUser) {
            // Only create new user if they don't exist
            const userData = {
              id: user.id,
              login: (profile as { login?: string }).login || user.id,
              email: user.email,
              name: user.name,
              avatar_url: user.image,
              credits: 100,
              total_credits_earned: 100,
              total_credits_spent: 0,
            };

            await supabaseAdmin.from("users").insert(userData);
          }
        }
      } catch (error) {
        console.error("Failed to create user on sign in:", error);
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

// Export handlers for App Router
export { handler as GET, handler as POST };
