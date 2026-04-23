/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.24.182.69"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://localhost:8000/auth/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
