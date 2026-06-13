import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.37"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
