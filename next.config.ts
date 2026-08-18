import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],

  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
