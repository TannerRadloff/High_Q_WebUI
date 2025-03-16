/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Server-specific config
    if (isServer) {
      // Ensure pdf-parse is only used on the server
      config.externals.push('canvas', 'jsdom');
    }

    // Add aliases for better imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd(),
    };

    return config;
  },
  // Use serverExternalPackages instead of transpilePackages for pdf-parse
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  output: 'standalone',
  poweredByHeader: false,
  onDemandEntries: {
    // Keep the build page in memory for longer
    maxInactiveAge: 60 * 60 * 1000,
    // Number of pages to keep in memory
    pagesBufferLength: 5,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', process.env.NEXT_PUBLIC_APP_URL],
    },
  },
  env: {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  // Custom rewrites before build starts
  async rewrites() {
    return [
      {
        source: '/api/chat',
        destination: '/api/chat',
      },
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 