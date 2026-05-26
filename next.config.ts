import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // turbopack: {

  // },
  // webpack: (
  //   config,
  //   { buildId, dev, isServer, defaultLoaders, webpack }
  // ) => {
  //   config.resolve.alias.canvas = false
  //   config.resolve.alias.encoding = false
  //   return config
  // },

    turbopack: {
    resolveAlias: {
      canvas: "./src/shims/empty.ts",
      encoding: "./src/shims/empty.ts",
     
    },
  },
};

export default nextConfig;
