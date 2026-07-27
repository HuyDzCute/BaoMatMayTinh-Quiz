/**
 * Dev-aware logger. Trong production, các lời gọi log chỉ in khi mức đó
 * được bật (warn / error). Trong development, in hết.
 *
 * Mục đích: giảm noise trong production console nhưng vẫn giữ khả năng debug
 * khi cần. Tất cả `console.*` rải rác trong codebase có thể dần migrate sang
 * helper này.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev && typeof console !== "undefined") console.log("[debug]", ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev && typeof console !== "undefined") console.info("[info]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (typeof console !== "undefined") console.warn("[warn]", ...args);
  },
  error: (...args: unknown[]) => {
    if (typeof console !== "undefined") console.error("[error]", ...args);
  },
} as const;
