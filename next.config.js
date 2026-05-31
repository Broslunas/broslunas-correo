/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Allow R2 downloads to stream without issues */
  poweredByHeader: false,
};

module.exports = nextConfig;
