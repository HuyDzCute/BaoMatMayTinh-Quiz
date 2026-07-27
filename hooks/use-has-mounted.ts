"use client";

import { useEffect, useState } from "react";

/**
 * Trả về `true` sau khi component mount trên client.
 * Dùng để tránh hydration mismatch khi render khác nhau giữa SSR và client
 * (ví dụ: state phụ thuộc `localStorage`, `window.innerWidth`, theme…).
 *
 * Pattern cũ lặp lại ở 8+ components:
 *   const [hydrated, setHydrated] = useState(false);
 *   useEffect(() => setHydrated(true), []);
 *   if (!hydrated) return <Fallback />;
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
