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
      
      // Ensure proper loading of client-side scripts
      if (dev) {
        config.output.publicPath = '/_next/';
      }
    }
    return config;
  },
  // Ensure pdf-parse is only used on the server
  transpilePackages: ['pdf-parse'],
  // Add the images configuration to allow avatar.vercel.sh domain
  images: {
    domains: ['avatar.vercel.sh'],
  },
  // Fix development asset loading
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : undefined,
};

module.exports = nextConfig; 