"use client";
import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

/**
 * Sanitize a color string before letting it touch an inline `style`. The
 * Hub renders `set.color` into CSS variables, and inline styles cannot be
 * sanitized by React (they go straight to `setAttribute('style', …)`). If a
 * user-supplied / imported color ever contains anything beyond a hex /
 * rgb() / hsl() / CSS-named-color value, an attacker could inject
 * `red; background:url(...)` etc. Restrict to known-safe formats.
 */
function safeColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  // Accept #RGB / #RRGGBB / #RRGGBBAA, rgb()/rgba()/hsl()/hsla(), or a
  // literal CSS named-color from a fixed allowlist. Anything else → fallback.
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\s*\(/i.test(v)) return v;
  const NAMED = new Set([
    "transparent", "currentColor", "inherit", "initial", "unset",
    "red","green","blue","yellow","orange","purple","pink","gray","grey",
    "black","white","brown","cyan","magenta","lime","navy","teal",
  ]);
  return NAMED.has(v.toLowerCase()) ? v : fallback;
}

function cardStyle(color: string): CSSProperties {
  const c = safeColor(color, "#3b82f6");
  return {
    ["--fc-accent" as string]: c,
    // The "1f" suffix appends an alpha channel. Only valid for hex.
    ["--fc-accent-soft" as string]: c.startsWith("#") ? `${c}1f` : c,
  } as CSSProperties;
}
import {
  BookOpen,
  Plus,
  Upload,
  Sparkles,
  Trash2,
  Library,
  ArrowRight,
  BarChart3,
  Bell,
  Layers,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlashcardSetIcon from "@/components/FlashcardSetIcon";
import FlashcardImportModal from "@/components/FlashcardImportModal";
import {
  getAllFlashcardSets,
  getSetStats,
  getDueCount,
  deleteUserFlashcardSet,
  getCrossSetDueSummary,
  type SetStudyStats,
} from "@/lib/flashcards-storage";
import type { FlashcardSet } from "@/lib/types";

export default function FlashcardsHubPage() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [stats, setStats] = useState<Record<string, SetStudyStats>>({});
  const [dueMap, setDueMap] = useState<Record<string, number>>({});
  const [showImport, setShowImport] = useState(false);
  const [crossDue, setCrossDue] = useState<{ totalDue: number; perSetCount: number }>({
    totalDue: 0,
    perSetCount: 0,
  });

  const refresh = useCallback(() => {
    const all = getAllFlashcardSets();
    setSets(all);
    // One pass: compute per-set stats and due count using a single
    // `getAllProgress()` read (which is the expensive part — JSON.parse +
    // migrate). Previous version triggered an O(N) parse per set on each
    // render. We rely on the same in-memory cache via the storage helpers.
    const nextStats: Record<string, SetStudyStats> = {};
    const nextDue: Record<string, number> = {};
    for (const s of all) {
      nextStats[s.id] = getSetStats(s.id, s.cards.length);
      nextDue[s.id] = getDueCount(s.id, s.cards.length);
    }
    setStats(nextStats);
    setDueMap(nextDue);
    setCrossDue(getCrossSetDueSummary());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    (setId: string) => {
      const confirmed = window.confirm("Xóa bộ thẻ này? Tiến độ học cũng sẽ bị xóa.");
      if (!confirmed) return;
      deleteUserFlashcardSet(setId);
      refresh();
    },
    [refresh],
  );

  const builtin = sets.filter((s) => s.builtin);
  const custom = sets.filter((s) => !s.builtin);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />
      <main className="flex-1 fc-page">
        <section className="fc-hero">
          <span className="fc-hero-eyebrow">
            <Sparkles size={12} /> Học từ vựng hiệu quả
          </span>
          <h1 className="fc-hero-title">Flashcards</h1>
          <p className="fc-hero-sub">
            Lật thẻ, tự đánh giá và để hệ thống phân loại từ cần ôn, từ đang học và từ đã thuộc — giống
            Quizlet, hoạt động hoàn toàn offline với dữ liệu lưu trên trình duyệt của bạn.
          </p>
        </section>

        <div className="fc-toolbar">
          <button
            type="button"
            className="fc-btn fc-btn-primary"
            onClick={() => setShowImport(true)}
          >
            <Plus size={14} />
            Tạo bộ thẻ mới
          </button>
          <button
            type="button"
            className="fc-btn fc-btn-ghost"
            onClick={() => setShowImport(true)}
          >
            <Upload size={14} />
            Import CSV / TXT
          </button>
          <Link href="/flashcards/stats" className="fc-btn fc-btn-ghost">
            <BarChart3 size={14} />
            Thống kê
          </Link>
          <span className="text-xs ml-auto" style={{ color: "#475569" }}>
            {sets.length} bộ thẻ · {sets.reduce((acc, s) => acc + s.cards.length, 0)} thẻ
          </span>
        </div>

        {crossDue.totalDue > 0 ? (
          <Link href="/flashcards/review" className="fc-cross-cta">
            <div className="fc-cross-cta-icon">
              <Zap size={20} />
            </div>
            <div className="fc-cross-cta-body">
              <div className="fc-cross-cta-title">
                Ôn tất cả thẻ đến hạn
                <span className="fc-cross-cta-badge">{crossDue.totalDue}</span>
              </div>
              <div className="fc-cross-cta-sub">
                Gộp mọi thẻ cần ôn từ <strong>{crossDue.perSetCount}</strong> bộ thành một phiên duy nhất —
                lapses & thẻ quá hạn được ưu tiên trước.
              </div>
            </div>
            <ArrowRight size={18} className="fc-cross-cta-arrow" />
          </Link>
        ) : (
          <div className="fc-cross-cta fc-cross-cta--empty">
            <div className="fc-cross-cta-icon fc-cross-cta-icon--muted">
              <Layers size={20} />
            </div>
            <div className="fc-cross-cta-body">
              <div className="fc-cross-cta-title">Không có thẻ nào đến hạn</div>
              <div className="fc-cross-cta-sub">
                Hãy học thêm từ mới trong từng bộ — khi có thẻ đến hạn, phiên ôn gộp sẽ xuất hiện tại đây.
              </div>
            </div>
          </div>
        )}

        {builtin.length > 0 && (
          <>
            <div className="fc-section-label">
              <span className="fc-section-label-text">Bộ thẻ có sẵn</span>
              <span className="fc-section-label-line" />
            </div>
            <div className="fc-grid">
              {builtin.map((s, i) => (
                <SetCard
                  key={s.id}
                  set={s}
                  stat={stats[s.id]}
                  due={dueMap[s.id] ?? 0}
                  index={i}
                  onDelete={null}
                />
              ))}
            </div>
          </>
        )}

        {custom.length > 0 && (
          <>
            <div className="fc-section-label">
              <span className="fc-section-label-text">Bộ thẻ của tôi</span>
              <span className="fc-section-label-line" />
            </div>
            <div className="fc-grid">
              {custom.map((s, i) => (
                <SetCard
                  key={s.id}
                  set={s}
                  stat={stats[s.id]}
                  due={dueMap[s.id] ?? 0}
                  index={i}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}

        {sets.length === 0 && (
          <div className="fc-empty">
            <div className="fc-empty-icon">
              <Library size={22} />
            </div>
            <p style={{ margin: 0 }}>Chưa có bộ thẻ nào — bấm &ldquo;Tạo bộ thẻ mới&rdquo; để import.</p>
          </div>
        )}
      </main>

      <Footer />

      {showImport && (
        <FlashcardImportModal
          onClose={() => setShowImport(false)}
          onImported={refresh}
        />
      )}
    </div>
  );
}

function SetCard({
  set,
  stat,
  due,
  index,
  onDelete,
}: {
  set: FlashcardSet;
  stat: SetStudyStats | undefined;
  due: number;
  index: number;
  onDelete: ((id: string) => void) | null;
}) {
  const mastery = stat?.mastery ?? 0;
  const stagger = Math.min(index, 6);
  return (
    <div
      className={`fc-set-card stagger-${stagger + 1}`}
      style={cardStyle(set.color)}
    >
      <span className="fc-set-card-accent" aria-hidden="true" />
      <div className="fc-set-card-head">
        <div className="fc-set-icon">
          <FlashcardSetIcon name={set.icon} size={20} color={set.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="fc-set-card-title">{set.name}</h3>
        </div>
        {set.builtin ? (
          <span className="fc-badge-builtin">
            <BookOpen size={9} /> MẶC ĐỊNH
          </span>
        ) : (
          <span className="fc-badge-imported">
            <Upload size={9} /> CỦA TÔI
          </span>
        )}
        {due > 0 && (
          <span
            className="fc-badge-due"
            title={`${due} thẻ đến hạn ôn — bấm "Học ngay" để ôn`}
          >
            <Bell size={9} /> {due} ĐẾN HẠN
          </span>
        )}
      </div>

      <p className="fc-set-card-desc">{set.description}</p>

      <div className="fc-set-card-stats">
        <span>{set.cards.length} thẻ</span>
        {stat && (
          <span style={{ color: mastery >= 80 ? "#34d399" : "#64748b" }}>
            {mastery}% đã thuộc
          </span>
        )}
      </div>

      {stat && (
        <div
          className="fc-mastery-bar"
          style={{ ["--fc-mastery-pct" as string]: `${mastery}%` } as React.CSSProperties}
        >
          <span className="fc-mastery-fill" />
        </div>
      )}

      <div className="flex items-center gap-2 mt-1">
        <Link
          href={`/flashcards/${encodeURIComponent(set.id)}`}
          className="fc-btn fc-btn-primary"
          style={{ flex: 1 }}
        >
          <span style={{ flex: 1, textAlign: "center" }}>Học ngay</span>
          <ArrowRight size={13} />
        </Link>
        {onDelete && (
          <button
            type="button"
            className="fc-btn fc-btn-danger"
            onClick={(e) => {
              e.preventDefault();
              onDelete(set.id);
            }}
            aria-label={`Xóa ${set.name}`}
            style={{ padding: "9px 11px" }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
