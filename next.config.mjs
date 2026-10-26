import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants.js";

const nextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  productionBrowserSourceMaps: false,

  output: process.platform === "win32" ? undefined : "standalone",

  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    path: "/_next/image",
    loader: "default",
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
  },

  trailingSlash: false,

  async headers() {
    return [
      {
        // Content-hashed image names can be cached across deployments safely.
        source: "/:asset(auth-banner|auth-logo|background).webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default (phase) => {
  // Next.js 14 also loads the production-build phase for `next lint`.
  // Linting must remain usable before a backend origin is confirmed.
  if (phase === PHASE_PRODUCTION_BUILD && process.argv[2] !== "lint") {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL must be configured before building");
    }
    const url = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      throw new Error(
        "NEXT_PUBLIC_BASE_URL must be an HTTP(S) backend origin without credentials, a path, query or fragment",
      );
    }
  }
  return {
    ...nextConfig,
    // Keep hot-reload chunks separate from production builds running in parallel.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
};
