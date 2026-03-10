/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for development
  reactStrictMode: true,

  // Allow dev origins for worktree subdomains
  allowedDevOrigins: ['*.localhost', 'localhost'],

  // Enable transpile packages from workspace
  transpilePackages: ['@monorepo/api-contract'],

  // Output mode for Docker deployment
  output: 'standalone',

  // Proxy /api/* to the API container in non-production environments.
  // Required for direct container-to-container access (e.g. Playwright hitting
  // http://web:3000) where Traefik is not in the request path.
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.INTERNAL_API_URL || 'http://localhost:8080'}/:path*`,
        },
      ];
    }
    return [];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
