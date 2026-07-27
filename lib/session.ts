/**
 * Session ID helpers for anonymous / local users.
 * Trước đây bị duplicate ở `lib/auth.tsx` và `lib/storage.ts`, giờ gom lại
 * để đảm bảo 1 nguồn truth duy nhất.
 */

const ANON_SESSION_KEY = "qthtm_anon_session_id";

/** Tạo/mã hóa session ID ngẫu nhiên cho anonymous user. */
export function getOrCreateAnonSessionId(): string {
  if (typeof window === "undefined") return "anon-unknown";
  try {
    let sid = window.localStorage.getItem(ANON_SESSION_KEY);
    if (!sid) {
      sid = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ANON_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Xóa session ID hiện tại (dùng khi sign-in Google thật). */
export function clearAnonSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANON_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export const SESSION_STORAGE_KEY = ANON_SESSION_KEY;
