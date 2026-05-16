/** @type {import('next').NextConfig} */
const path = require("path");
const fs = require("fs");

// Next.js loads .env.production for application code automatically, but NOT
// for next.config.js itself. We need NEXT_PUBLIC_BACKEND_URL here for the
// /api/* proxy rewrite, so load the env files manually.
function loadEnvFile(filename) {
  const filepath = path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) return;
  for (const line of fs.readFileSync(filepath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

// Load order matches Next.js convention: more specific wins.
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
loadEnvFile(envFile);
loadEnvFile(".env");

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["172.24.182.69"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${BACKEND_URL}/auth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
