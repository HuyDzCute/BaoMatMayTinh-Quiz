"use client";

/**
 * AiCoachChat — UI chat giống "khung chat" ở ảnh 1 của yêu cầu.
 *
 * Layout:
 *   • Header:  avatar gradient "HuyDz AI Assistant" + badge "Online" + dot pulse
 *   • Body:    messages bubbles (assistant xám trái, user gradient xanh phải)
 *   • Footer:  suggestion chips (khi rỗng) + input textarea + send button
 *
 * Toàn bộ:
 *   - Lưu conversation vào Firestore (`/api/chat/...`)
 *   - Gọi Gemini qua server proxy (`/api/gemini`)
 *   - KHÔNG để lộ API key ở frontend
 *   - KHÔNG dùng localStorage / SQLite / file JSON
 */

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, FileText, Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { useConversations, useMessages, askGemini, ChatMessage } from "@/lib/useChat";

const SUGGESTIONS = [
  {
    label: "Giải thích 'due to'",
    prompt: "Giải thích cách dùng 'due to' và cho 5 ví dụ trong IELTS Writing.",
  },
  {
    label: "Paraphrase 'important'",
    prompt: "Cho mình 10 cách paraphrase từ 'important' trong Writing Task 2.",
  },
  {
    label: "Vocabulary chủ đề Crime",
    prompt: "Liệt kê các cụm từ vựng IELTS hay gặp chủ đề Crime, kèm phiên âm và nghĩa.",
  },
  {
    label: "Tạo bài Speaking Part 2",
    prompt:
      "Viết cho mình một bài mẫu Speaking Part 2 về 'một người bạn thân', kèm gợi ý band 7.5+.",
  },
];

export default function AiCoachChat() {
  const { user, isCloudEnabled } = useAuth();
  const {
    items: convList,
    loading: convLoading,
    error: convError,
    createConversation,
    deleteConversation,
  } = useConversations();

  const [activeId, setActiveId] = useState<string | null>(null);
  const { items: messages, sendMessage, appendLocal } = useMessages(activeId);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-new conversation when user bắt đầu chat nhưng chưa có conversation
  useEffect(() => {
    if (!user || convLoading) return;
    if (convList.length === 0 && !activeId && !sending) {
      // Don't auto-create; user phải bấm nút
    }
  }, [user, convLoading, convList.length, activeId, sending]);

  // Auto scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, activeId, sending]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    if (!user) {
      alert("Bạn cần đăng nhập để dùng AI Coach.");
      return;
    }
    setInput("");
    setSending(true);

    try {
      let convId = activeId;
      if (!convId) {
        const title = content.slice(0, 60) || "Cuộc trò chuyện mới";
        const conv = await createConversation(title);
        if (!conv) {
          setSending(false);
          return;
        }
        convId = conv.id;
        setActiveId(convId);
      }

      // 1) Lưu user message
      await sendMessage("user", content);

      // 2) Lấy tất cả messages hiện tại + user message mới để build context
      //    Lưu ý: server proxy sẽ tự lấy Firestore nhưng ta gửi kèm lịch sử
      //    ngắn qua body để giảm round-trip.
      const historyForGemini = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      let reply = "";
      try {
        reply = await askGemini(historyForGemini);
      } catch (e) {
        reply = `⚠️ Lỗi Gemini: ${(e as Error).message}`;
      }

      // 3) Append assistant message local (server sẽ lưu qua /messages nếu muốn,
      //    nhưng ta save đồng thời để đảm bảo lịch sử trên Firestore.)
      const saved = await sendMessage("model", reply);
      if (!saved) {
        // Fallback: chỉ append local
        const fallback: ChatMessage = {
          id: `local-${Date.now()}`,
          role: "model",
          content: reply,
          createdAt: new Date().toISOString(),
        };
        appendLocal(fallback);
      }
    } finally {
      setSending(false);
    }
  }

  function handleNewConversation() {
    setActiveId(null);
  }

  async function handleDeleteConversation(id: string) {
    if (!confirm("Xoá cuộc trò chuyện này?")) return;
    await deleteConversation(id);
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="aicoach-root">
      <Header />

      <div className="aicoach-wrap">
        {/* ── Sidebar: conversations ─────────────────────────── */}
        <aside className="aicoach-sidebar">
          <button className="aicoach-new-btn" onClick={handleNewConversation} type="button">
            <Plus size={16} aria-hidden="true" />
            <span>Cuộc trò chuyện mới</span>
          </button>

          <div className="aicoach-side-header">
            <span>Lịch sử ({convList.length})</span>
          </div>

          <div className="aicoach-conv-list">
            {convList.length === 0 && !convLoading && (
              <div className="aicoach-conv-empty">Chưa có cuộc trò chuyện nào.</div>
            )}
            {convLoading && convList.length === 0 && (
              <div className="aicoach-conv-empty">
                <Loader2 size={14} className="aicoach-spin" />
                Đang tải...
              </div>
            )}
            {convList.map((c) => (
              <div
                key={c.id}
                className={`aicoach-conv-item ${activeId === c.id ? "is-active" : ""}`}
                onClick={() => setActiveId(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setActiveId(c.id);
                }}
              >
                <MessageSquare size={13} aria-hidden="true" />
                <span className="aicoach-conv-title">{c.title || "Không tiêu đề"}</span>
                <button
                  type="button"
                  className="aicoach-conv-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(c.id);
                  }}
                  aria-label="Xoá cuộc trò chuyện"
                  title="Xoá"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {convError && <div className="aicoach-side-error">{convError}</div>}
        </aside>

        {/* ── Main chat panel ─────────────────────────── */}
        <main className="aicoach-main">
          <div className="aicoach-shell">
            {/* Header */}
            <div className="aicoach-shell-header">
              <div className="aicoach-avatar">
                <span>H</span>
              </div>
              <div className="aicoach-header-info">
                <div className="aicoach-header-title">HuyDz AI Assistant</div>
                <div className="aicoach-header-sub">
                  <span className="aicoach-pulse" aria-hidden="true" />
                  <span>Online · Trả lời về IELTS & QTHTM</span>
                </div>
              </div>
              <div className="aicoach-header-spacer" />
              <div className="aicoach-header-tag">
                <Sparkles size={11} aria-hidden="true" />
                <span>Beta</span>
              </div>
            </div>

            {/* Body */}
            <div className="aicoach-body" ref={scrollRef}>
              {messages.length === 0 ? (
                <EmptyState
                  onPick={handleSend}
                  sending={sending}
                  disabled={!user || !isCloudEnabled}
                />
              ) : (
                messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
              {sending && (
                <div className="aicoach-bubble aicoach-bubble-assistant">
                  <div className="aicoach-bubble-av">H</div>
                  <div className="aicoach-bubble-body">
                    <span className="aicoach-typing">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / input */}
            <div className="aicoach-input">
              <button
                type="button"
                className="aicoach-input-icon"
                title="Sắp tới: đính kèm"
                aria-label="Đính kèm"
                disabled
              >
                <FileText size={15} aria-hidden="true" />
              </button>
              <textarea
                className="aicoach-input-textarea"
                placeholder={user ? "Nhập câu hỏi cho AI..." : "Đăng nhập để chat với AI"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                disabled={!user || sending}
                aria-label="Tin nhắn"
              />
              <button
                type="button"
                className={`aicoach-send ${sending || !input.trim() || !user ? "is-disabled" : ""}`}
                disabled={sending || !input.trim() || !user}
                onClick={() => handleSend()}
                aria-label="Gửi"
              >
                {sending ? (
                  <Loader2 size={15} className="aicoach-spin" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
              </button>
            </div>

            {!user && (
              <div className="aicoach-warn">
                Bạn cần đăng nhập (Google hoặc Khách) để dùng AI Coach và lưu lịch sử trên
                Firestore.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`aicoach-bubble ${isUser ? "aicoach-bubble-user" : "aicoach-bubble-assistant"}`}
    >
      {!isUser && <div className="aicoach-bubble-av">H</div>}
      <div className="aicoach-bubble-body">
        <div className="aicoach-bubble-content">
          {msg.content.split("\n").map((line, i) => (
            <p key={i}>{line || "\u00a0"}</p>
          ))}
        </div>
      </div>
      {isUser && <div className="aicoach-bubble-av aicoach-bubble-av-user">B</div>}
    </div>
  );
}

function EmptyState({
  onPick,
  sending,
  disabled,
}: {
  onPick: (text: string) => void;
  sending: boolean;
  disabled: boolean;
}) {
  return (
    <div className="aicoach-empty">
      <div className="aicoach-empty-hero">
        <div className="aicoach-empty-avatar">H</div>
        <div>
          <div className="aicoach-empty-title">Xin chào! Mình là HuyDz AI Assistant</div>
          <div className="aicoach-empty-sub">
            Trợ lý chuyên về IELTS (vocab, writing, speaking) và bảo mật máy tính (QTHTM). Mọi cuộc
            trò chuyện sẽ được lưu trên Firestore.
          </div>
        </div>
      </div>

      <div className="aicoach-suggest-label">
        <Sparkles size={12} />
        <span>Gợi ý nhanh</span>
      </div>
      <div className="aicoach-suggest-grid">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="aicoach-suggest-chip"
            onClick={() => onPick(s.prompt)}
            disabled={sending || disabled}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
