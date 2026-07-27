"use client";

import { useEffect } from "react";

export type ShortcutHandler = (e: KeyboardEvent) => void;

export type ShortcutMap = Record<string, ShortcutHandler>;

/**
 * Hotkey format: ví dụ "ctrl+k", "cmd+s", "shift+/", "alt+n", "escape"
 * Phân biệt platform: trên Mac, "ctrl" tự động map sang "cmd"
 */
export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const isMac =
      typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    const handler = (e: KeyboardEvent) => {
      // Bỏ qua khi đang gõ vào input/textarea/contenteditable (trừ phím Escape)
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (inEditable && e.key !== "Escape") return;

      for (const [combo, fn] of Object.entries(map)) {
        if (matchCombo(combo, e, isMac)) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map, enabled]);
}

function matchCombo(combo: string, e: KeyboardEvent, isMac: boolean): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);

  const wantsCtrl = mods.includes("ctrl") || (isMac && mods.includes("cmd"));
  const wantsCmd = mods.includes("cmd");
  const wantsShift = mods.includes("shift");
  const wantsAlt = mods.includes("alt") || mods.includes("option");

  if (wantsCtrl && !(e.ctrlKey || (isMac && e.metaKey))) return false;
  if (wantsCmd && !e.metaKey) return false;
  if (wantsShift && !e.shiftKey) return false;
  if (wantsAlt && !e.altKey) return false;

  return e.key.toLowerCase() === key;
}

export const SHORTCUTS_HELP: Array<{ combo: string; desc: string }> = [
  { combo: "ctrl+k", desc: "Mở tìm kiếm nhanh" },
  { combo: "ctrl+/", desc: "Mở bảng phím tắt" },
  { combo: "esc", desc: "Đóng modal / overlay" },
  { combo: "↑ / ↓", desc: "Điều hướng trong danh sách" },
  { combo: "enter", desc: "Xác nhận" },
];
