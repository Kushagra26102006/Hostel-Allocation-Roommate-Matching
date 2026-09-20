import type { NextConfig } from "next";

// Node 25 experimental localStorage workaround: uninitialized globalThis.localStorage breaks libraries like next-themes
if (typeof globalThis.localStorage !== "undefined" && typeof (globalThis as unknown as Storage).getItem !== "function") {
  delete (globalThis as Record<string, unknown>).localStorage;
}

const nextConfig: NextConfig = {
  // Allow importing workspace packages as source (no pre-build needed in dev)
  transpilePackages: ["@hostelhub/domain", "@hostelhub/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
