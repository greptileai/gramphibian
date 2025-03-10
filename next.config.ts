import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SHOULD_PUBLISH: process.env.NEXT_PUBLIC_SHOULD_PUBLISH || 'false'
  }
};

export default nextConfig;
