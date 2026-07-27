"use client";

import ChatPanel from "@/components/chat/ChatPanel";

/**
 * Full-page Discord-style chat.
 *
 * Render dạng page route — KHÔNG dùng FAB, full-height trên viewport.
 */
export default function ChatPage() {
  return (
    <div style={{ height: "calc(100dvh - 56px - 4px)", marginTop: 0 }}>
      <ChatPanel variant="page" />
    </div>
  );
}
