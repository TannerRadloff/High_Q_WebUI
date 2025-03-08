/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
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
    return config;
  },
  // Ensure pdf-parse is only used on the server
  transpilePackages: ['pdf-parse'],
};

module.exports = nextConfig; 