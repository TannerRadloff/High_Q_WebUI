/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
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
  // Add the images configuration to allow avatar.vercel.sh domain
  images: {
    domains: ['avatar.vercel.sh'],
  },
  // Remove the assetPrefix configuration as it's causing issues
  // assetPrefix: process.env.NODE_ENV === 'development' ? '' : undefined,
  // Add proper output configurations
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig; 