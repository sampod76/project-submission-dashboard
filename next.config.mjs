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

  env: {
    BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
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

export default nextConfig;
