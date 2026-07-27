"use client";

import dynamic from "next/dynamic";

// ChatLauncher opens Firebase RTDB listeners and pulls Howler etc —
// too heavy for the initial render. Lazy-load on the client only.
const ChatLauncher = dynamic(() => import("@/components/chat/ChatLauncher"), {
  ssr: false,
  loading: () => null,
});

export default ChatLauncher;
