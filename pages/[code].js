import { getLink } from "../lib/store";

/**
 * Dynamic redirect route: /<code>
 * Looks up the short code in the store and redirects to the original Discord invite URL.
 * Returns a 404 page if the code is not found.
 */
export function getServerSideProps({ params }) {
  const { code } = params;

  let url = null;
  try {
    url = getLink(code);
  } catch (err) {
    console.error("Failed to look up short code:", err);
    return { notFound: true };
  }

  if (!url) {
    return { notFound: true };
  }

  return {
    redirect: {
      destination: url,
      permanent: false,
    },
  };
}

// This component is never rendered because getServerSideProps either redirects or returns 404
export default function RedirectPage() {
  return null;
}
