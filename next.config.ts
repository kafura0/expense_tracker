import type { NextConfig } from "next";

// NOTE: There is intentionally NO `Content-Security-Policy` here. The strict
// nonce + hash CSP is generated per-request in `src/proxy.ts` (see
// `src/shared/lib/security-headers.ts`). A static CSP header here would be
// overridden by the proxy and a static `'unsafe-inline'` script-src would
// silently weaken it.
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// A constant build ID keeps the prerendered HTML byte-for-byte deterministic
// across rebuilds. The RSC payload embeds the build ID (`"b"` field); with the
// default random ID every build produced different inline script content,
// which broke build-time CSP hash generation (see scripts/generate-csp-hashes.mjs).
// Chunk filenames are content-hashed, so a constant ID cannot collide.
const nextConfig: NextConfig = {
  generateBuildId: async () => 'ledgerly',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
