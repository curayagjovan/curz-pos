import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  transpilePackages: ["antd-mobile"],
};

export default nextConfig;
