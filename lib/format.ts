/**
 * Time / duration formatting helpers.
 * Trước đây `fmt(secs)` được định nghĩa lặp lại trong IELTSReadingView,
 * IELTSSpeakingView, ResultCard → gom lại thành 1 helper duy nhất.
 */

/** Format giây thành mm:ss (e.g. 75 → "1:15"). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Format milliseconds thành mm:ss (cho quiz timer). */
export function formatMsAsClock(ms: number): string {
  return formatTime(Math.max(0, ms) / 1000);
}

/** Format relative time (e.g. "5 phút trước", "2 giờ trước"). */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} tháng trước`;
  const year = Math.floor(month / 12);
  return `${year} năm trước`;
}
