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
    // Skip server-side rendering for authenticated pages to avoid SSR issues
    isrMemoryCacheSize: 0,
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
  
  // Configure runtime settings for pages
  modularizeImports: {
    // Support ESM
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  
  // Custom error handling
  // Redirect to custom error pages for common errors
  async headers() {
    return [
      {
        source: '/(.*)',
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Skip pre-rendering for authenticated pages
  // This prevents issues with auth state on pages that require auth
  async exportPathMap(defaultPathMap, { dev, dir, outDir, distDir, buildId }) {
    // In development, we don't need to customize the export path map
    if (dev) {
      return defaultPathMap;
    }
    
    // Remove paths that require authentication from static export
    // This ensures they'll be rendered on-demand with access to auth state
    const filteredPaths = { ...defaultPathMap };
    
    // Remove authenticated pages from static generation
    delete filteredPaths['/'];  // Homepage requires auth
    delete filteredPaths['/chat']; // Chat pages require auth
    delete filteredPaths['/settings']; // Settings requires auth
    delete filteredPaths['/profile']; // Profile requires auth
    
    return filteredPaths;
  }
};

module.exports = nextConfig; 