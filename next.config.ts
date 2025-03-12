/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
  },
  webpack: (config: any, { isServer, dev }: { isServer: boolean; dev: boolean }) => {
    // Only include the pdf-parse module on the server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        zlib: false,
      };
      
      // Ensure proper loading of client-side scripts
      if (dev) {
        config.output.publicPath = '/_next/';
      }
    }
    
    // Explicitly add alias configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './'),
    };
    
    return config;
  },
  // Ensure pdf-parse is only used on the server
  transpilePackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // Fix development asset loading
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : undefined,
};

export default nextConfig;
