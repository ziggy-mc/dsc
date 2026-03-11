import { getLink } from "../lib/store";

const PRIMARY_DOMAIN = "https://dscs.ziggymc.me";

/**
 * Dynamic redirect route: /<code>
 *
 * Behaviour:
 *  - If the request comes from the Vercel domain (zmcdsc.vercel.app), it acts
 *    as a pure redirect domain: resolve the code and forward to the Discord
 *    invite URL.
 *  - If the short code is not found (on either domain), redirect the visitor
 *    to the primary domain with an error query param so the UI can surface a
 *    helpful message.
 */
export async function getServerSideProps({ params, req }) {
  const { code } = params;

  let url = null;
  try {
    url = await getLink(code);
  } catch (err) {
    console.error("Failed to look up short code:", err);
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  if (!url) {
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: url,
      permanent: false,
    },
  };
}

// This component is never rendered because getServerSideProps always redirects
export default function RedirectPage() {
  return null;
}
