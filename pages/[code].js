import { connectToDatabase } from "../lib/mongodb";
import ShortLink from "../models/ShortLink";
import { getLink } from "../lib/store";

const PRIMARY_DOMAIN = "https://dscs.ziggymc.me";

/**
 * Resolve a short code from new ShortLink collection, falling back to the
 * legacy "dsc" collection for codes created before this update.
 * Returns { targetUrl, isPermanent, expiresAt, ownerDiscordId } or null.
 */
async function resolveCode(code) {
  await connectToDatabase();

  // Check new ShortLink model first (and increment the open counter)
  const sl = await ShortLink.findOneAndUpdate(
    { code },
    { $inc: { count: 1 } },
    { new: true, lean: true }
  );
  if (sl) {
    return {
      targetUrl: sl.targetUrl,
      isPermanent: sl.isPermanent,
      expiresAt: sl.expiresAt,
      ownerDiscordId: sl.ownerDiscordId,
    };
  }

  // Fall back to legacy store
  const legacyUrl = await getLink(code);
  if (legacyUrl) {
    return {
      targetUrl: legacyUrl,
      isPermanent: false,
      expiresAt: null,
      ownerDiscordId: null,
    };
  }

  return null;
}

export async function getServerSideProps({ params }) {
  const { code } = params;

  let resolved = null;
  try {
    resolved = await resolveCode(code);
  } catch (err) {
    console.error("Failed to resolve short code:", err);
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  if (!resolved) {
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  const { targetUrl, isPermanent, expiresAt } = resolved;

  // Check expiration
  if (!isPermanent && expiresAt && new Date(expiresAt) <= new Date()) {
    // Clean up expired link
    try {
      await ShortLink.deleteOne({ code });
    } catch (delErr) {
      console.error("Failed to delete expired link:", delErr);
    }
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=expired`,
        permanent: false,
      },
    };
  }

  // Redirect all users directly to the target URL so Discord's embed crawler
  // can resolve the actual invite and display the proper embed preview.
  return {
    redirect: {
      destination: targetUrl,
      permanent: false,
    },
  };
}

// Next.js requires a default export for dynamic route pages even when
// getServerSideProps always redirects and this component is never rendered.
export default function RedirectPage() {
  return null;
}
