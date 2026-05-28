import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";
import {
  normalizeEmail,
  verifyAndConsumeCode,
} from "../../../lib/authCodeService";

function buildDiscordAvatarUrl(profile) {
  if (!profile?.id || !profile?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
    CredentialsProvider({
      id: "email-code",
      name: "Email One-Time Passcode",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const code = String(credentials?.code || "").trim();

        if (!email || !/^\d{6}$/.test(code)) {
          return null;
        }

        await connectToDatabase();

        const verified = await verifyAndConsumeCode({
          email,
          type: "1pass",
          code,
        });

        if (!verified.ok) {
          return null;
        }

        const user = await User.findOne({
          email,
          emailVerified: true,
          suspended: { $ne: true },
        }).lean();

        if (!user) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.username || user.discordUsername,
          image: user.avatarUrl || null,
          discordId: user.discordId,
          discordUsername: user.discordUsername,
          email: user.email,
          twoFactorEnabled: !!user.twoFactorEnabled,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && profile && account.provider === "discord") {
        token.discordId = profile.id;
        token.discordUsername = profile.username;
        token.authMethod = "discord";
      }

      if (account?.provider === "email-code" && user) {
        token.discordId = user.discordId;
        token.discordUsername = user.discordUsername;
        token.authMethod = "sso";
      }

      if (token?.discordId) {
        try {
          await connectToDatabase();
          const existingUser = await User.findOne({
            discordId: token.discordId,
            suspended: { $ne: true },
          })
            .select("discordUsername sessionVersion")
            .lean();

          if (!existingUser) {
            token.invalidated = true;
            delete token.discordId;
            delete token.discordUsername;
          } else {
            token.invalidated = false;
            token.discordUsername = existingUser.discordUsername;
            token.sessionVersion = existingUser.sessionVersion || 0;
          }
        } catch (err) {
          console.error("Failed to validate session token user:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.invalidated || !token?.discordId) {
        session.user = undefined;
        return session;
      }

      session.user.discordId = token.discordId;
      session.user.discordUsername = token.discordUsername;
      session.user.authMethod = token.authMethod;
      session.user.sessionVersion = token.sessionVersion || 0;
      return session;
    },

    async signIn({ account, profile }) {
      if (account?.provider !== "discord") {
        return true;
      }

      try {
        await connectToDatabase();

        const email = normalizeEmail(profile?.email);
        const avatarUrl = buildDiscordAvatarUrl(profile);
        const username = profile?.global_name || profile?.username || "";

        const user = await User.findOneAndUpdate(
          { discordId: profile.id },
          {
            $set: {
              discordUsername: profile.username,
              username,
              avatarUrl,
              ...(email ? { email } : {}),
            },
            $setOnInsert: {
              discordId: profile.id,
              emailVerified: false,
              twoFactorEnabled: false,
              "shortener.enabled": true,
              "shortener.totalLinksCreated": 0,
            },
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        if (user && user.suspended) {
          return "/?error=suspended";
        }

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
