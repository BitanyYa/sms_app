import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fix workspace root detection warning caused by multiple lockfiles
    root: path.resolve(__dirname),
  },

  // Disable the X-Powered-By header in responses
  poweredByHeader: false,

  // Enforce trailing-slash consistency
  trailingSlash: false,

  // Strict mode for React
  reactStrictMode: true,
};

export default nextConfig;
