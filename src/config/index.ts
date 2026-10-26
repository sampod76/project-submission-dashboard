const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_BASE_URL is not configured");
}

const config = {
  host: BASE_URL,
};

export default config;
