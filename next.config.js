/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  // Increase serverActions body size limit for file uploads
  serverActions: {
    bodySizeLimit: '50mb',
  },
};

module.exports = nextConfig;
