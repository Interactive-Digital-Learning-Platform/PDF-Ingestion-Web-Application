import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained `.next/standalone` build (server.js + only the
  // node_modules actually traced as needed) so the production Docker image
  // can run without installing dependencies. See Dockerfile.
  output: "standalone",
};

export default nextConfig;
