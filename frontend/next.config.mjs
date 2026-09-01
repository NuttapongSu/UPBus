/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unset in production (served at the domain root). Set to e.g. "/fulltest"
  // for an instance reverse-proxied under a URL path, so Next.js's own
  // routing/asset URLs come out prefixed to match the proxy rule.
  basePath: process.env.NEXT_BASE_PATH || '',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  },
};

export default nextConfig;
