"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Hash, Bot, Sparkles, ArrowRight, Send, Smile, X } from "lucide-react";
import { useCurrentUser, useRooms, useMessages, sendMessage } from "@/lib/chat";

/**
 * Widget "Phòng chat cộng đồng" — bố cục giống khung chat học sinh:
 *  ┌──────────────── banner tiêu đề (full width) ────────────────┐
 *  │ Trò chuyện                                                [↗]│
 *  │ Cùng nhau trao đổi, hỏi bài, ôn thi QTHTM                      │
 *  ├──────────── sidebar online ────────┬──── main chat panel ────┤
 *  │ ● Đang online (12)                  │ # Phòng chung · 12 mem │
 *  │ • Nguyễn Văn A                      │  [12 tin nhắn scroll]  │
 *  │ • Trần Thị B                        │                        │
 *  │ • Phòng: # chung                    │ [input] [😀] [Gửi]     │
 *  │ • Phòng: AI Assistant               │                        │
 *  │ • Phòng: Luyện thi                  │ Hiện giờ chưa có bài…   │
 *  └─────────────────────────────────────┴────────────────────────┘
 */
export default function CommunityChatWidget() {
  const router = useRouter();
  const me = useCurrentUser();
  const rooms = useRooms(me);

  const lobby =
    rooms.find((r) => r.id === "global-lobby") ?? rooms.find((r) => r.type !== "ai") ?? rooms[0];
  const activeRoomId = lobby?.id ?? null;
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  useEffect(() => {
    if (activeRoomId && !activeRoom) setActiveRoom(activeRoomId);
  }, [activeRoomId, activeRoom]);
  const currentRoom = rooms.find((r) => r.id === activeRoom) ?? lobby;
  const messages = useMessages(currentRoom?.id ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const visible = messages.slice(-30);
  const aiRoom = rooms.find((r) => r.type === "ai");
  const chatRooms = rooms.filter((r) => r.type !== "ai");

  // Online members: from current room (uid → name lookup from chatUsers cache or
  // synthesize from message senders). Since members is a string[] of uids, we
  // display the sender names we've seen in this room's messages.
  const onlineMembers = useMemo(() => {
    if (!currentRoom) return [];
    const uids = currentRoom.members;
    const known = new Map<string, { uid: string; name: string; color: string }>();
    for (const m of messages) {
      if (!known.has(m.senderUid)) {
        known.set(m.senderUid, {
          uid: m.senderUid,
          name: m.senderName,
          color: "#3b82f6",
        });
      }
    }
    for (const u of uids) {
      if (!known.has(u)) {
        known.set(u, { uid: u, name: u === me?.uid ? "Bạn" : u.slice(0, 6), color: "#06b6d4" });
      }
    }
    return Array.from(known.values());
  }, [currentRoom, messages, me?.uid]);

  const handleSend = async () => {
    if (!me || !currentRoom) return;
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMessage(me, currentRoom.id, { text: t, type: "text" });
      setText("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // SSR: render skeleton
  if (!mounted) {
    return (
      <section className="ccw-root" aria-label="Phòng chat cộng đồng">
        <div className="ccw-card">
          <div className="ccw-banner">
            <div className="ccw-banner-title">Trò chuyện</div>
            <div className="ccw-banner-sub">Đang tải phòng chat…</div>
          </div>
          <div className="ccw-skel" />
        </div>
      </section>
    );
  }

  return (
    <section className="ccw-root" aria-label="Phòng chat cộng đồng">
      <div className="ccw-card">
        {/* ───── Banner trên cùng (full width) ───── */}
        <header className="ccw-banner">
          <div className="ccw-banner-left">
            <div className="ccw-banner-icon">
              <MessageCircle size={18} style={{ color: "#fff" }} />
            </div>
            <div>
              <div className="ccw-banner-title">Trò chuyện</div>
              <div className="ccw-banner-sub">Cùng nhau trao đổi, hỏi bài, ôn thi QTHTM</div>
            </div>
          </div>
          <div className="ccw-banner-right">
            <span className="ccw-pill">
              <span className="ccw-pill-dot" /> LIVE
            </span>
            <button
              type="button"
              className="ccw-open"
              onClick={() => router.push("/chat")}
              aria-label="Mở khung chat đầy đủ"
            >
              Mở rộng <ArrowRight size={12} />
            </button>
          </div>
        </header>

        {/* ───── Bố cục 2 cột: sidebar + main ───── */}
        <div className="ccw-layout">
          {/* ─── Sidebar: danh sách phòng + online ─── */}
          <aside className="ccw-side" aria-label="Danh sách phòng & online">
            {/* Phòng chat */}
            <div className="ccw-side-block">
              <div className="ccw-side-label">
                <Hash size={11} /> Phòng chat
              </div>
              <ul className="ccw-room-list">
                {chatRooms.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`ccw-room-btn ${currentRoom?.id === r.id ? "is-active" : ""}`}
                      onClick={() => setActiveRoom(r.id)}
                    >
                      <span className="ccw-room-hash">#</span>
                      <span className="ccw-room-text">{r.name}</span>
                      <span className="ccw-room-count">{r.members.length}</span>
                    </button>
                  </li>
                ))}
                {aiRoom && (
                  <li>
                    <button
                      type="button"
                      className={`ccw-room-btn is-ai ${
                        currentRoom?.id === aiRoom.id ? "is-active" : ""
                      }`}
                      onClick={() => setActiveRoom(aiRoom.id)}
                    >
                      <Bot size={11} />
                      <span className="ccw-room-text">{aiRoom.name}</span>
                      <Sparkles size={9} style={{ color: "#a855f7" }} />
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Đang online */}
            <div className="ccw-side-block">
              <div className="ccw-side-label">
                <span className="ccw-online-dot" /> Đang online ({onlineMembers.length})
              </div>
              <ul className="ccw-user-list">
                {onlineMembers.slice(0, 8).map((m) => (
                  <li key={m.uid} className="ccw-user">
                    <span
                      className="ccw-user-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${m.color ?? "#3b82f6"}, #1e293b)`,
                      }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="ccw-user-name">{m.name}</span>
                    {m.uid === me?.uid && <span className="ccw-user-self">bạn</span>}
                  </li>
                ))}
                {onlineMembers.length > 8 && (
                  <li className="ccw-user-more">+{onlineMembers.length - 8} người khác</li>
                )}
              </ul>
            </div>
          </aside>

          {/* ─── Main: chat panel ─── */}
          <div className="ccw-main" aria-label="Khung chat">
            {/* Sub-header */}
            <div className="ccw-main-head">
              <div className="ccw-main-room">
                {currentRoom?.type === "ai" ? (
                  <Bot size={13} style={{ color: "#a855f7" }} />
                ) : (
                  <Hash size={13} style={{ color: "#60a5fa" }} />
                )}
                <span className="ccw-main-roomname">{currentRoom?.name ?? "Chọn phòng"}</span>
                <span className="ccw-main-meta">{currentRoom?.members.length ?? 0} thành viên</span>
              </div>
              <div className="ccw-main-actions">
                <button
                  type="button"
                  className="ccw-iconbtn"
                  aria-label="Đóng"
                  onClick={() => router.push("/")}
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="ccw-body">
              {visible.length === 0 ? (
                <div className="ccw-empty">
                  <div className="ccw-empty-emoji">💬</div>
                  <div>Chưa có tin nhắn nào</div>
                </div>
              ) : (
                <ul className="ccw-list" ref={listRef}>
                  {visible.map((m) => {
                    const mine = m.senderUid === me?.uid;
                    const isAi = m.type === "ai" || m.senderUid === "ai-assistant";
                    return (
                      <li
                        key={m.id}
                        className={`ccw-msg ${mine ? "is-mine" : ""} ${isAi ? "is-ai" : ""}`}
                      >
                        <div
                          className="ccw-msg-avatar"
                          style={
                            isAi
                              ? {
                                  background: "linear-gradient(135deg, #a855f7, #6d28d9)",
                                }
                              : mine
                                ? {
                                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                                  }
                                : undefined
                          }
                        >
                          {isAi ? <Bot size={11} /> : m.senderName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="ccw-msg-body">
                          <div className="ccw-msg-meta">
                            <span className="ccw-msg-author">{m.senderName}</span>
                            <span className="ccw-msg-time">
                              {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="ccw-msg-text">{m.text}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Composer */}
            <div className="ccw-composer">
              <button
                type="button"
                className="ccw-emoji"
                aria-label="Emoji"
                onClick={() => setText((t) => t + "🙂")}
              >
                <Smile size={16} />
              </button>
              <input
                type="text"
                className="ccw-input"
                placeholder={
                  me
                    ? currentRoom
                      ? `Nhắn vào ${currentRoom.name}…`
                      : "Chọn phòng để nhắn…"
                    : "Đăng nhập để nhắn…"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                disabled={!me || sending || !currentRoom}
                aria-label="Ô nhập tin nhắn"
              />
              <button
                type="button"
                className="ccw-send"
                onClick={() => void handleSend()}
                disabled={!me || sending || !text.trim() || !currentRoom}
                aria-label="Gửi"
              >
                <Send size={14} />
                <span>Gửi</span>
              </button>
            </div>

            {/* Footer dòng "Hiện giờ chưa có bài viết nào!" */}
            <div className="ccw-foot">
              {visible.length === 0 ? (
                <span>
                  Hiện giờ chưa có bài viết nào! <strong>Bạn hãy là người đầu tiên!</strong>
                </span>
              ) : (
                <span>
                  Đang hiển thị {visible.length} / {messages.length} tin nhắn trong{" "}
                  <strong>{currentRoom?.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
