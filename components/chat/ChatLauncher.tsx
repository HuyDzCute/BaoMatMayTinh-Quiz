"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

/**
 * Floating chat launcher.
 *
 * - FAB bottom-right (renders globally in <RootLayout>)
 * - Click → drawer opens with full chat
 * - Header also links to /chat (handled separately)
 */
export default function ChatLauncher() {
  const [open, setOpen] = useState(false);

  // Hide FAB on /chat (full-page mode handles it)
  const [isChatPage, setIsChatPage] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const path = window.location.pathname;
      setIsChatPage(path === "/chat");
    };
    check();
    const onPop = () => check();
    window.addEventListener("popstate", onPop);
    // Observe path changes (Next.js client navigation). We poll
    // `window.location.pathname` rather than monkey-patching `pushState`
    // — that's brittle and the 200ms tick is cheap.
    let last = window.location.pathname;
    const interval = setInterval(() => {
      const cur = window.location.pathname;
      if (cur !== last) {
        last = cur;
        check();
      }
    }, 200);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearInterval(interval);
    };
  }, []);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isChatPage && !open) return null;

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        aria-label={open ? "Đóng chat" : "Mở chat"}
        title={open ? "Đóng chat" : "Mở chat"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && !isChatPage && (
        <>
          <div className="chat-drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="chat-drawer" role="dialog" aria-label="Khung chat cộng đồng">
            <ChatPanel variant="drawer" onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
