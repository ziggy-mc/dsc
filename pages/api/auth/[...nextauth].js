import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Persist the Discord user id and username into the JWT token.
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id;
        token.discordUsername = profile.username;
      }
      return token;
    },

    /**
     * Expose discordId and discordUsername on the client-side session object.
     */
    async session({ session, token }) {
      session.user.discordId = token.discordId;
      session.user.discordUsername = token.discordUsername;
      return session;
    },

    /**
     * After a successful sign-in, upsert the User document in MongoDB.
     */
    async signIn({ profile }) {
      try {
        await connectToDatabase();
        await User.findOneAndUpdate(
          { discordId: profile.id },
          {
            $set: { discordUsername: profile.username },
            $setOnInsert: {
              discordId: profile.id,
              "shortener.enabled": true,
              "shortener.totalLinksCreated": 0,
            },
          },
          { upsert: true, new: true }
        );
        return true;
      } catch (err) {
        console.error("Failed to upsert user on sign-in:", err);
        return false;
      }
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
