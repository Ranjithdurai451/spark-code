import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

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
        token.login = (profile as any)?.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.login = token.login;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Control if a user is allowed to sign in
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

// Export handlers for App Router
export { handler as GET, handler as POST };
