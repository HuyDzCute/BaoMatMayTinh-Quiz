import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tránh cắt CSS khi globals.css lớn (>220KB) — bundle 1 file duy nhất
    // cho mỗi page. Tránh lỗi Turbopack chunker khiến CSS bị truncate.
    cssChunking: false,
  },
};

export default nextConfig;
