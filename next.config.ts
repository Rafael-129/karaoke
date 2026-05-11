import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  api: {
    // Allow up to 55 MB per request so 3 MB audio chunks pass through untruncated
    responseLimit: "55mb",
    bodyParser: {
      sizeLimit: "55mb",
    },
  },
};

export default nextConfig;
