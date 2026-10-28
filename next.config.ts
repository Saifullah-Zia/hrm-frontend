import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The service worker must never be cached by the browser/CDN,
        // otherwise users could be stuck on an old version.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  // Turbopack can mis-infer the project root; pin it so `next` resolves from this folder.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;