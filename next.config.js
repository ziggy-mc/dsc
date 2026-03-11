/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Mongoose / MongoDB use Node.js built-ins that are not available in the
      // browser. Tell webpack to substitute them with empty stubs so the
      // client bundle doesn't fail when these modules are transitively imported
      // (e.g. from a page file that also exports getServerSideProps).
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        "fs/promises": false,
        child_process: false,
        dns: false,
        os: false,
        path: false,
        stream: false,
        crypto: false,
        "timers/promises": false,
        async_hooks: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
