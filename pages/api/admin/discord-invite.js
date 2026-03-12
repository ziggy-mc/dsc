import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const ADMIN_DISCORD_ID = "794228666518339604";

const DISCORD_API_TIMEOUT = 4000;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { code } = req.query;
  if (!code || typeof code !== "string" || !/^[a-zA-Z0-9-]+$/.test(code)) {
    return res.status(400).json({ error: "Invalid invite code." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCORD_API_TIMEOUT);

    const discordRes = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code)}`,
      {
        headers: { "User-Agent": "DSC-Admin/1.0 (+https://ds.ziggymc.me)" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!discordRes.ok) {
      return res.status(200).json({ serverName: null, serverDescription: null });
    }

    const data = await discordRes.json();
    return res.status(200).json({
      serverName: data.guild?.name ?? null,
      serverDescription: data.guild?.description ?? null,
    });
  } catch {
    return res.status(200).json({ serverName: null, serverDescription: null });
  }
}
