import { getLink } from "../lib/store";

/**
 * Dynamic redirect route: /<code>
 * Looks up the short code in the store and redirects to the original Discord invite URL.
 * Returns a 404 page if the code is not found.
 */
export async function getServerSideProps({ params }) {
  const { code } = params;
  const url = getLink(code);

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
