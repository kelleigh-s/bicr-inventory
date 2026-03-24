import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Team Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.TEAM_PASSWORD) {
          return { id: "team", name: "BICR Team" };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
};
