const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim();

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_BASE_URL is not configured");
}

const config = {
  host: BASE_URL.replace(/\/+$/, ""),
};

export default config;
