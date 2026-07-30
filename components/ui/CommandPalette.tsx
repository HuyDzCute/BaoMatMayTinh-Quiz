"use client";

import { useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react";
import {
  Home,
  History,
  Trophy,
  BookOpen,
  MessageCircle,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Đóng bằng Escape + Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "home",
        label: "Trang chủ",
        description: "Về trang chủ QuizHub",
        icon: <Home size={16} />,
        action: () => router.push("/"),
        keywords: ["home", "trang chu"],
      },
      {
        id: "quiz",
        label: "Làm bài thi",
        description: "Bắt đầu một bài quiz mới",
        icon: <Layers size={16} />,
        action: () => router.push("/"),
        keywords: ["quiz", "bai thi", "test"],
      },
      {
        id: "flashcards",
        label: "Học từ vựng",
        description: "Flashcard IELTS, TOEIC, Oxford",
        icon: <BookOpen size={16} />,
        action: () => router.push("/flashcards"),
        keywords: ["flashcard", "tu vung", "vocab"],
      },
      {
        id: "history",
        label: "Lịch sử làm bài",
        description: "Xem kết quả các bài đã làm",
        icon: <History size={16} />,
        action: () => router.push("/history"),
        keywords: ["history", "lich su"],
      },
      {
        id: "leaderboard",
        label: "Bảng xếp hạng",
        description: "Top người chơi hàng đầu",
        icon: <Trophy size={16} />,
        action: () => router.push("/leaderboard"),
        keywords: ["leaderboard", "xep hang", "rank"],
      },
      {
        id: "chat",
        label: "Cộng đồng",
        description: "Chat realtime với mọi người",
        icon: <MessageCircle size={16} />,
        action: () => router.push("/chat"),
        keywords: ["chat", "cong dong", "community"],
      },
      {
        id: "ai",
        label: "AI Assistant",
        description: "Hỏi AI bất cứ điều gì",
        icon: <Sparkles size={16} />,
        action: () => router.push("/chat"),
        keywords: ["ai", "assistant", "gemini"],
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [it.label, it.description ?? "", ...(it.keywords ?? [])].join(" ").toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [items, query]);

  const run = useCallback((item: CommandItem) => {
    item.action();
    setOpen(false);
  }, []);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) run(item);
    }
  };

  if (!open) return null;

  return (
    <div className="cmd-backdrop" onClick={() => setOpen(false)}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Bảng lệnh"
      >
        <div className="cmd-search">
          <Search size={16} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm trang, lệnh…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onInputKey}
            className="cmd-input"
            aria-label="Tìm kiếm"
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>

        <div className="cmd-results" role="listbox">
          {filtered.length === 0 ? (
            <div className="cmd-empty">
              <div style={{ fontSize: 24, opacity: 0.5 }}>🤷</div>
              <div>Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</div>
            </div>
          ) : (
            filtered.map((it, i) => (
              <button
                key={it.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={`cmd-item ${i === activeIdx ? "is-active" : ""}`}
                onClick={() => run(it)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="cmd-item-icon">{it.icon}</span>
                <span className="cmd-item-body">
                  <span className="cmd-item-label">{it.label}</span>
                  {it.description && <span className="cmd-item-desc">{it.description}</span>}
                </span>
                <ArrowRight size={14} className="cmd-item-arrow" />
              </button>
            ))
          )}
        </div>

        <div className="cmd-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> điều hướng
          </span>
          <span>
            <kbd>↵</kbd> chọn
          </span>
          <span>
            <kbd>esc</kbd> đóng
          </span>
        </div>
      </div>
    </div>
  );
}
