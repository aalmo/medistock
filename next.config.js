/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Ensure Prisma's native .node engine binaries are not bundled by webpack
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],
  // Fix: webpack cache rename race condition on macOS (ENOENT .pack.gz_ -> .pack.gz)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        ...config.cache,
        compression: false,   // disable gzip compression — avoids the rename temp file
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    // allow local /uploads and external http images
    unoptimized: true,
  },
}

module.exports = nextConfig
