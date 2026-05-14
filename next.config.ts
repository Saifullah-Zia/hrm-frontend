import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack can mis-infer the project root; pin it so `next` resolves from this folder.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
