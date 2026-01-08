import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/BioTender",
  assetPrefix: "/BioTender/",
};

export default nextConfig;
