import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle in .next/standalone, which is what
  // the Dockerfile copies. Keeps the runtime image small.
  output: "standalone",

  turbopack: {
    resolveAlias: {
      // pdfjs (via react-pdf) tries to resolve these optional native modules
      // but never uses them in the browser.
      canvas: "./src/shims/empty.ts",
      encoding: "./src/shims/empty.ts",
    },
  },
};

export default nextConfig;
