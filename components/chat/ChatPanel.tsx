"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Send,
  Image as ImageIcon,
  X,
  Hash,
  Bot,
  Users,
  Sparkles,
  Reply,
  Smile,
  Trash2,
  CheckCheck,
  AlertCircle,
  Mic,
  ArrowLeft,
} from "lucide-react";
import {
  useCurrentUser,
  useRooms,
  useMessages,
  useTypingUsers,
  sendMessage,
  createRoom,
  joinRoom,
  setReaction,
  deleteMessage as deleteMsg,
  markSeen,
  setTyping,
  uploadImage,
  type ChatRoom,
  type ChatMessage,
} from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { logger } from "@/lib/logger";

/* ════════════════════════════════════════════════════════════════════════════
   Emoji set
   ════════════════════════════════════════════════════════════════════════════ */

const EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "🎉",
  "🔥",
  "👏",
  "😢",
  "😮",
  "🤔",
  "🙏",
  "💯",
  "✨",
  "🤝",
  "💡",
  "🚀",
  "✅",
  "❌",
  "👀",
];

function timeOfDay(d: Date | number): string {
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dayLabel(d: Date | number): string {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Check if two timestamps are within 5 min and from same sender → group. */
function shouldGroup(prev: ChatMessage | null, curr: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.senderUid !== curr.senderUid) return false;
  if (curr.createdAt - prev.createdAt > 5 * 60 * 1000) return false;
  return true;
}

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

/* ════════════════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════════════════ */

type ChatPanelProps = {
  variant?: "drawer" | "page";
  initialRoomId?: string | null;
  onClose?: () => void;
};

export default function ChatPanel({ variant = "drawer", initialRoomId, onClose }: ChatPanelProps) {
  const me = useCurrentUser();
  const auth = useAuth();
  const rooms = useRooms(me);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId ?? null);
  const [tab, setTab] = useState<"rooms" | "ai">("rooms");
  const [showNewRoom, setShowNewRoom] = useState(false);
  // Default sidebar visible on desktop (>720px), hidden on mobile.
  // Tránh hydration mismatch: luôn default false trên SSR, rồi set sau mount.
  const [mobileSidebar, setMobileSidebar] = useState(false);
  // Track phòng vừa tạo để effect auto-select không override
  const justCreatedRef = useRef<string | null>(null);
  // Track các setTimeout để cancel khi unmount
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const safeSetTimeout = useCallback(
    (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      const t = setTimeout(() => {
        timeoutsRef.current.delete(t);
        fn();
      }, ms);
      timeoutsRef.current.add(t);
      return t;
    },
    [],
  );

  // Cleanup tất cả pending timeouts khi unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  // Sau mount, detect viewport để quyết định mobileSidebar ban đầu
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMobileSidebar(window.innerWidth > 720);
  }, []);

  // Pick first room by default + honor "ai" tab.
  // Đọc activeRoomId qua ref để tránh stale closure mà không cần disable ESLint.
  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    if (!me) return;
    const list = rooms;

    // Nếu vừa tạo phòng → bỏ qua auto-select
    if (justCreatedRef.current) {
      if (list.some((r) => r.id === justCreatedRef.current)) {
        safeSetTimeout(() => {
          justCreatedRef.current = null;
        }, 100);
      }
      setMobileSidebar(false);
      return;
    }

    const currentId = activeRoomIdRef.current;
    if (currentId && list.some((r) => r.id === currentId)) {
      setMobileSidebar(false);
      return;
    }
    if (list.length === 0) {
      setActiveRoomId(null);
      return;
    }
    const preferred = tab === "ai" ? list.find((r) => r.type === "ai") : null;
    const target = preferred ?? list[0];
    if (target) {
      setActiveRoomId(target.id);
      joinRoom(me, target.id).catch(() => {});
    }
    setMobileSidebar(true);
  }, [rooms, tab, me?.uid, safeSetTimeout]);

  const activeRoom: ChatRoom | null = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const messages = useMessages(activeRoomId);
  const typingUsers = useTypingUsers(activeRoomId);

  const handleSelectRoom = (roomId: string) => {
    if (!me) return;
    setActiveRoomId(roomId);
    setMobileSidebar(false);
    joinRoom(me, roomId).catch(() => {});
  };

  const typingOthers = useMemo(
    () => typingUsers.filter((t) => t.uid !== me?.uid),
    [typingUsers, me?.uid],
  );

  /* ─── Body ───────────────────────────────────────────────────────────── */
  // Auth gate nếu user chưa đăng nhập (dù khi này useCurrentUser đã có local guest uid).
  // Vẫn cho phép local guest vào để demo — khi backend thật, local guest sẽ bị chặn.
  return (
    <div
      className={`chat-root ${variant === "drawer" ? "is-drawer" : ""} ${mobileSidebar ? "is-mobile-sidebar" : ""}`}
    >
      {/* ── Sidebar ── */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <span className="chat-sidebar-title-dot" aria-hidden="true" />
            <Hash size={14} />
            Cộng đồng
          </div>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
            style={{ width: 30, height: 30 }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="chat-sidebar-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "rooms"}
            className={`chat-sidebar-tab ${tab === "rooms" ? "is-active" : ""}`}
            onClick={() => setTab("rooms")}
          >
            <Users size={13} /> Phòng
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ai"}
            className={`chat-sidebar-tab ${tab === "ai" ? "is-active" : ""}`}
            onClick={() => setTab("ai")}
          >
            <Bot size={13} /> AI
          </button>
        </div>

        <RoomList rooms={rooms} tab={tab} activeId={activeRoomId} onSelect={handleSelectRoom} />

        <button
          type="button"
          className="chat-new-btn"
          onClick={() => setShowNewRoom(true)}
          aria-label="Tạo phòng mới"
        >
          <Plus size={14} /> Tạo phòng mới
        </button>

        {me && (
          <div
            className="chat-sidebar-header"
            style={{ borderTop: "1px solid var(--chat-border)", paddingTop: 10, paddingBottom: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <div className="chat-msg-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                {me.photoURL ? (
                  <SafeAvatar
                    src={me.photoURL}
                    alt=""
                    width={30}
                    height={30}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    fallback={initialsFromName(me.displayName)}
                  />
                ) : (
                  initialsFromName(me.displayName)
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {me.displayName}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--chat-text-muted)" }}>
                  {me.isAnonymous ? "Khách cục bộ" : "Online"}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="chat-main">
        {activeRoom ? (
          <ChatRoomView
            room={activeRoom}
            me={me}
            messages={messages}
            typingOthers={typingOthers}
            isAuthed={!!auth.user}
            authUser={auth.user}
            authApi={auth}
            onClose={onClose}
            onBack={() => setMobileSidebar(true)}
            mobileBackVisible={variant === "page"}
          />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-emoji">💬</div>
            <div className="chat-empty-title">Chưa có phòng nào</div>
            <div className="chat-empty-desc">
              Tạo phòng đầu tiên hoặc chờ được mời. Mọi phòng đều realtime cho mọi người dùng đã
              đăng nhập.
            </div>
          </div>
        )}
      </main>

      {showNewRoom && (
        <NewRoomModal
          me={me}
          onClose={() => setShowNewRoom(false)}
          onCreated={(id) => {
            setShowNewRoom(false);
            setMobileSidebar(false);
            justCreatedRef.current = id;
            setActiveRoomId(id);
            // Clear flag sau khi effect re-run
            safeSetTimeout(() => {
              justCreatedRef.current = null;
            }, 800);
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Subcomponents
   ════════════════════════════════════════════════════════════════════════════ */

function RoomList({
  rooms,
  tab,
  activeId,
  onSelect,
}: {
  rooms: ChatRoom[];
  tab: "rooms" | "ai";
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    if (tab === "ai") return rooms.filter((r) => r.type === "ai");
    return rooms.filter((r) => r.type !== "ai");
  }, [rooms, tab]);

  if (filtered.length === 0) {
    return (
      <div className="chat-empty" style={{ flex: "none", padding: 24 }}>
        <div className="chat-empty-emoji" style={{ fontSize: 36, opacity: 0.4 }}>
          —
        </div>
        <div className="chat-empty-desc">
          {tab === "ai" ? "Chưa có phòng AI." : "Chưa có phòng nào."}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room-list" role="listbox" aria-label="Danh sách phòng">
      {filtered.map((r) => (
        <button
          key={r.id}
          type="button"
          role="option"
          aria-selected={r.id === activeId}
          onClick={() => onSelect(r.id)}
          className={`chat-room ${r.id === activeId ? "is-active" : ""}`}
        >
          <div className="chat-room-icon" aria-hidden="true">
            {r.type === "ai" ? "🤖" : r.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="chat-room-body">
            <div className="chat-room-name">{r.name}</div>
            {r.lastMessage && (
              <div className="chat-room-preview">
                <strong style={{ color: "var(--chat-accent)", fontWeight: 600 }}>
                  {r.lastMessage.senderName}:
                </strong>{" "}
                {r.lastMessage.text}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Room view ───────────────────────────────────────────────────────── */

function ChatRoomView({
  room,
  me,
  messages,
  typingOthers,
  isAuthed,
  authUser,
  authApi,
  onClose,
  onBack,
  mobileBackVisible,
}: {
  room: ChatRoom;
  me: ReturnType<typeof useCurrentUser>;
  messages: ChatMessage[];
  typingOthers: { uid: string; displayName: string }[];
  isAuthed: boolean;
  authUser: ReturnType<typeof useAuth>["user"];
  authApi: ReturnType<typeof useAuth>;
  onClose?: () => void;
  onBack: () => void;
  mobileBackVisible: boolean;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionForMsg, setReactionForMsg] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  const lastMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last.id;
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
    if (me && last.senderUid !== me.uid) {
      markSeen(me, room.id, last.id).catch(() => {});
    }
  }, [messages, me?.uid, room.id]);

  const parentIds = useMemo(
    () => new Set(messages.filter((m) => m.parentId).map((m) => m.parentId!)),
    [messages],
  );
  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  // Mark seen + clear typing on unmount
  useEffect(() => {
    if (!me || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderUid !== me.uid) markSeen(me, room.id, last.id).catch(() => {});
  }, [messages.length, room.id, me?.uid]);

  // Reset state on room change
  useEffect(() => {
    setText("");
    setReplyTo(null);
    setEmojiPickerOpen(false);
    setReactionForMsg(null);
  }, [room.id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!me || !trimmed || sending) return;
    const parentId = replyTo?.id ?? null;
    setText("");
    setReplyTo(null);
    setSending(true);
    setAiLoading(room.type === "ai");

    try {
      await sendMessage(me, room.id, {
        text: trimmed,
        type: "text",
        parentId: parentId ?? undefined,
      });
      if (room.type === "ai") {
        // Build prompt from recent context (last 12 messages)
        const recent = messages.slice(-12);
        const convo = recent
          .map((m) => ({
            role: m.type === "ai" ? "model" : "user",
            content: m.text,
          }))
          .concat({ role: "user" as const, content: trimmed });
        try {
          const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: convo,
              system:
                "Bạn là AI Assistant của QuizHub. Trả lời ngắn gọn, thân thiện, dùng tiếng Việt trừ khi user viết tiếng Anh.",
            }),
          });
          const data = await res.json();
          if (res.ok && data.text) {
            await sendMessage(
              {
                uid: "ai-assistant",
                displayName: "AI Assistant",
                photoURL: null,
                isAnonymous: true,
              },
              room.id,
              { text: data.text, type: "ai" },
            );
          } else {
            await sendMessage(
              {
                uid: "ai-assistant",
                displayName: "AI Assistant",
                photoURL: null,
                isAnonymous: true,
              },
              room.id,
              {
                text: `❌ AI không trả lời được: ${data.error ?? "lỗi không xác định"}`,
                type: "ai",
              },
            );
            toast.error("AI không phản hồi. Vui lòng thử lại.");
          }
        } catch (err) {
          await sendMessage(
            { uid: "ai-assistant", displayName: "AI Assistant", photoURL: null, isAnonymous: true },
            room.id,
            { text: `❌ Lỗi kết nối tới AI service.`, type: "ai" },
          );
          toast.error("Mất kết nối tới AI service.");
        } finally {
          setAiLoading(false);
        }
      }
    } catch (err) {
      logger.warn("[chat] sendMessage failed", err);
      toast.error("Không gửi được tin nhắn. Vui lòng thử lại.");
      setAiLoading(false);
    } finally {
      setSending(false);
    }
    // Reset typing indicator
    setTyping(me, room.id, false).catch(() => {});
  };

  const handleAttach = async (file: File | undefined) => {
    if (!file || !me) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5 MB.");
      return;
    }
    try {
      const url = await uploadImage(file);
      await sendMessage(me, room.id, { text: file.name, type: "image", imageUrl: url });
      toast.success("Đã gửi ảnh");
    } catch (err) {
      logger.warn("[chat] upload failed", err);
      toast.error("Tải ảnh lên thất bại.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
      return;
    }
    // typing indicator
    if (me) setTyping(me, room.id, true).catch(() => {});
  };

  return (
    <>
      {/* ── Header ── */}
      <header className="chat-header">
        <button
          type="button"
          className="chat-icon-btn chat-mobile-toggle"
          aria-label="Mở danh sách phòng"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="chat-header-icon" aria-hidden="true">
          {room.type === "ai" ? "🤖" : room.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">{room.name}</div>
          <div className="chat-header-desc">
            {room.description ?? `${room.members.length} thành viên`}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="chat-icon-btn chat-drawer-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        )}
      </header>

      {/* ── Messages scroll ── */}
      <div className="chat-scroll" ref={scrollRef as never}>
        {!isAuthed && (
          <div className="chat-config-warn" style={{ margin: "0 8px 12px" }}>
            <AlertCircle size={14} />
            <span>Bạn đang ở chế độ khách cục bộ. Tin nhắn chỉ lưu trên máy này.</span>
            <button
              type="button"
              className="hdr-signin-btn"
              style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12, height: 26 }}
              onClick={async () => {
                try {
                  await authApi.signInWithGoogle();
                } catch {
                  /* ignore */
                }
              }}
            >
              Đăng nhập
            </button>
          </div>
        )}
        {messages.length === 0 && !aiLoading ? (
          <div className="chat-empty">
            <div className="chat-empty-emoji">🌱</div>
            <div className="chat-empty-title">Bắt đầu cuộc trò chuyện</div>
            <div className="chat-empty-desc">
              Tin nhắn đầu tiên sẽ được lưu vĩnh viễn và hiển thị cho mọi thành viên trong phòng.
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            me={me}
            parentIds={parentIds}
            messagesById={messagesById}
            onReply={(m) => setReplyTo(m)}
            onReact={async (m, emoji) => {
              if (!me) return;
              await setReaction(room.id, m.id, me.uid, emoji);
              setReactionForMsg(null);
              setEmojiPickerOpen(false);
            }}
            onDelete={async (m) => {
              if (!confirm("Xoá tin nhắn này?")) return;
              await deleteMsg(room.id, m.id);
            }}
            onZoom={setZoomedImage}
            reactionForMsg={reactionForMsg}
            onOpenReaction={(id) => {
              setReactionForMsg(id);
              setEmojiPickerOpen(false);
            }}
            onCloseReaction={() => setReactionForMsg(null)}
            isMine={(m) => !!me && m.senderUid === me.uid}
          />
        )}

        {aiLoading && (
          <div className="chat-msg" style={{ paddingLeft: 8, opacity: 0.8 }}>
            <div
              className="chat-msg-avatar"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
              aria-hidden="true"
            >
              <Bot size={16} />
            </div>
            <div className="chat-msg-body">
              <div className="chat-msg-meta">
                <span
                  className="chat-msg-author"
                  style={{
                    background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  AI Assistant
                </span>
                <span className="chat-msg-time">đang suy nghĩ…</span>
              </div>
              <div className="chat-typing-dots" style={{ marginTop: 4 }}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {typingOthers.length > 0 && (
          <div className="chat-typing" aria-live="polite">
            <span className="chat-typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {typingOthers.map((t, i) => (
              <span key={t.uid} style={{ fontWeight: 600 }}>
                {t.displayName}
                {i < typingOthers.length - 2 ? ", " : i === typingOthers.length - 2 ? " và " : ""}
              </span>
            ))}
            đang nhập…
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <div className="chat-composer">
        {replyTo && (
          <div className="chat-reply-preview">
            <Reply size={14} style={{ color: "#93c5fd", flexShrink: 0 }} />
            <div className="chat-reply-preview-text">
              <strong>{replyTo.senderName}</strong>: {replyTo.text}
            </div>
            <button
              type="button"
              className="chat-reply-preview-cancel"
              aria-label="Huỷ trả lời"
              onClick={() => setReplyTo(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="chat-input-row">
          <button
            type="button"
            className="chat-attach-btn"
            aria-label="Đính kèm hình ảnh"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              void handleAttach(f);
              if (e.target) e.target.value = "";
            }}
          />
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={room.type === "ai" ? "Hỏi AI bất cứ điều gì…" : "Nhắn tin…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="Ô nhập tin nhắn"
          />
          {room.type === "ai" && (
            <button
              type="button"
              className="chat-attach-btn"
              aria-label="Mic (chưa hỗ trợ)"
              title="Mic — sắp ra mắt"
              disabled
            >
              <Mic size={16} />
            </button>
          )}
          <button
            type="button"
            className="chat-send"
            aria-label={sending ? "Đang gửi" : "Gửi"}
            onClick={() => void handleSend()}
            disabled={!text.trim() || aiLoading || sending}
          >
            {sending ? (
              <span className="chat-send-spinner" aria-hidden="true" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      {zoomedImage && (
        <div className="chat-image-zoom" role="dialog" onClick={() => setZoomedImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- zoomed user content */}
          <img src={zoomedImage} alt="phóng to" />
        </div>
      )}
    </>
  );
}

/* ─── Message list ────────────────────────────────────────────────────── */

function MessageList({
  messages,
  me,
  parentIds,
  messagesById,
  onReply,
  onReact,
  onDelete,
  onZoom,
  reactionForMsg,
  onOpenReaction,
  onCloseReaction,
  isMine,
}: {
  messages: ChatMessage[];
  me: ReturnType<typeof useCurrentUser>;
  parentIds: Set<string>;
  messagesById: Map<string, ChatMessage>;
  onReply: (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
  onDelete: (m: ChatMessage) => void;
  onZoom: (url: string) => void;
  reactionForMsg: string | null;
  onOpenReaction: (msgId: string) => void;
  onCloseReaction: () => void;
  isMine: (m: ChatMessage) => boolean;
}) {
  let prevDateLabel: string | null = null;
  const elements: React.ReactNode[] = [];

  messages.forEach((msg, idx) => {
    const label = dayLabel(msg.createdAt);
    if (label !== prevDateLabel) {
      elements.push(
        <div key={`day-${msg.id}`} className="chat-day-sep">
          {label}
        </div>,
      );
      prevDateLabel = label;
    }

    const prev = idx > 0 ? messages[idx - 1] : null;
    const grouped = shouldGroup(prev, msg);

    elements.push(
      <MessageBubble
        key={msg.id}
        msg={msg}
        grouped={grouped}
        me={me}
        parentMsg={msg.parentId ? (messagesById.get(msg.parentId) ?? null) : null}
        onReply={() => onReply(msg)}
        onReact={(emoji) => void onReact(msg, emoji)}
        onDelete={() => onDelete(msg)}
        onZoom={onZoom}
        reactionPickerOpen={reactionForMsg === msg.id}
        onOpenReaction={() => onOpenReaction(msg.id)}
        onCloseReaction={onCloseReaction}
        mine={isMine(msg)}
      />,
    );
  });

  return <>{elements}</>;
}

function MessageBubble({
  msg,
  grouped,
  me,
  parentMsg,
  onReply,
  onReact,
  onDelete,
  onZoom,
  reactionPickerOpen,
  onOpenReaction,
  onCloseReaction,
  mine,
}: {
  msg: ChatMessage;
  grouped: boolean;
  me: ReturnType<typeof useCurrentUser>;
  parentMsg: ChatMessage | null;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onZoom: (url: string) => void;
  reactionPickerOpen: boolean;
  onOpenReaction: () => void;
  onCloseReaction: () => void;
  mine: boolean;
}) {
  const isAI = msg.type === "ai" || msg.senderUid === "ai-assistant";
  const isMine = mine;
  const seenCount = msg.seenBy.length - (msg.seenBy.includes(msg.senderUid) ? 1 : 0);
  const showSeen = isMine && seenCount > 0;

  return (
    <article
      className={`chat-msg ${grouped ? "is-grouped" : ""} ${isAI ? "is-ai" : ""} ${isMine ? "is-mine" : ""}`}
    >
      {!grouped && (
        <div className="chat-msg-avatar" aria-hidden="true">
          {msg.senderPhoto ? (
            <SafeAvatar
              src={msg.senderPhoto}
              alt=""
              width={36}
              height={36}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              fallback={isAI ? <Bot size={18} /> : initialsFromName(msg.senderName)}
            />
          ) : isAI ? (
            <Bot size={18} />
          ) : (
            initialsFromName(msg.senderName)
          )}
        </div>
      )}
      <div className="chat-msg-body">
        {!grouped && (
          <div className="chat-msg-meta">
            <span className="chat-msg-author">{msg.senderName}</span>
            <span className="chat-msg-time">{timeOfDay(msg.createdAt)}</span>
          </div>
        )}
        {parentMsg && (
          <button
            type="button"
            className="chat-reply-quote"
            onClick={() => {
              const el = document.querySelector(`[data-msg-id="${parentMsg.id}"]`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <Reply size={12} style={{ color: "#93c5fd", flexShrink: 0 }} />
            <span className="chat-reply-quote-name">{parentMsg.senderName}</span>
            <span className="chat-reply-quote-text">{parentMsg.text || "📷 Hình ảnh"}</span>
          </button>
        )}
        {msg.type === "image" && msg.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded content; can't pre-optimize through `next/image`
          <img
            src={msg.imageUrl}
            alt={msg.text}
            className="chat-msg-image"
            onClick={() => onZoom(msg.imageUrl!)}
            loading="lazy"
          />
        )}
        {msg.text && msg.type !== "image" && (
          <div className="chat-msg-text" data-msg-id={msg.id}>
            {msg.text}
          </div>
        )}
        {Object.entries(msg.reactions).length > 0 && (
          <div className="chat-reactions">
            {Object.entries(msg.reactions).map(([emoji, uids]) => {
              const mineReacted = me ? uids.includes(me.uid) : false;
              return (
                <button
                  type="button"
                  key={emoji}
                  className={`chat-reaction ${mineReacted ? "is-mine" : ""}`}
                  onClick={() => onReact(emoji)}
                  aria-label={`Phản ứng ${emoji}, ${uids.length} người`}
                >
                  <span>{emoji}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
        {showSeen && (
          <div className="chat-seen-row">
            <CheckCheck size={11} style={{ color: "#60a5fa" }} />
            Đã xem bởi {seenCount} người
          </div>
        )}
        <div className="chat-msg-actions">
          <button type="button" onClick={() => onReact("👍")} aria-label="Like">
            <Smile size={14} />
          </button>
          <button type="button" onClick={onOpenReaction} aria-label="Thêm reaction">
            <Sparkles size={14} />
          </button>
          <button type="button" onClick={onReply} aria-label="Trả lời">
            <Reply size={14} />
          </button>
          {mine && (
            <button type="button" onClick={onDelete} aria-label="Xoá">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {reactionPickerOpen && (
          <div
            className="chat-emoji-picker"
            style={{ position: "absolute", top: 30, right: 12 }}
            role="dialog"
          >
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => onReact(e)} aria-label={`Phản ứng ${e}`}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── New room modal ──────────────────────────────────────────────────── */

function NewRoomModal({
  me,
  onClose,
  onCreated,
}: {
  me: ReturnType<typeof useCurrentUser>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!me) return null;

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (trimmedName.length < 3) {
      toast.warning("Tên phòng phải có ít nhất 3 ký tự.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createRoom(me, { name: trimmedName, description: desc.trim() });
      toast.success(`Đã tạo phòng "${trimmedName}"`);
      onCreated(id);
    } catch (err) {
      logger.warn("[chat] create room failed", err);
      toast.error("Tạo phòng thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="chat-modal-title">Tạo phòng mới</div>
        <div className="chat-modal-desc">
          Phòng mới sẽ realtime cho mọi thành viên. Bạn tự động trở thành admin.
        </div>

        <label htmlFor="chat-room-name">Tên phòng</label>
        <input
          id="chat-room-name"
          className="chat-modal-input"
          placeholder="vd: Hỏi đáp luyện thi, Thảo luận IELTS…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />

        <label htmlFor="chat-room-desc" style={{ marginTop: 12 }}>
          Mô tả (tuỳ chọn)
        </label>
        <input
          id="chat-room-desc"
          className="chat-modal-input"
          placeholder="Mô tả ngắn về chủ đề phòng"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={120}
        />

        <div className="chat-modal-actions">
          <button
            type="button"
            className="chat-modal-btn chat-modal-btn-secondary"
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="chat-modal-btn chat-modal-btn-primary"
            disabled={!name.trim() || submitting}
            onClick={() => void handleCreate()}
          >
            {submitting ? "Đang tạo…" : "Tạo phòng"}
          </button>
        </div>
      </div>
    </div>
  );
}
