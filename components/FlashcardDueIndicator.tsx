"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Bell } from "lucide-react";
import { getCrossSetDueSummary } from "@/lib/flashcards-storage";

/**
 * Compact badge that shows the total number of flashcards currently due for
 * review across ALL sets. Click to jump straight into the cross-set review
 * session. Hidden on /flashcards/review itself (you're already there) and on
 * pages that aren't auth-gated enough to render — the Hub is the canonical
 * landing.
 *
 * Listens for a "qthtm_flashcard_progress" storage change so the badge
 * updates immediately after the user finishes a study session in another tab.
 */
export default function FlashcardDueIndicator() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    try {
      const summary = getCrossSetDueSummary();
      setCount(summary.totalDue);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    function onStorage(e: StorageEvent) {
      if (
        e.key === "qthtm_flashcard_progress" ||
        e.key === "qthtm_flashcard_user_sets" ||
        e.key === null
      ) {
        refresh();
      }
    }
    window.addEventListener("storage", onStorage);
    // Same-tab updates: a custom event dispatched after each rating in the
    // study session so the badge bumps in real time without a full reload.
    function onCustom() { refresh(); }
    window.addEventListener("qthtm:flashcard-progress-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("qthtm:flashcard-progress-changed", onCustom);
    };
  }, [refresh]);

  // Don't render on the review page itself
  if (!mounted) return null;
  if (pathname?.startsWith("/flashcards/review")) return null;
  // Only show on Flashcards-related routes to avoid distracting on the quiz pages
  const onFlashcardsRoute =
    pathname === "/flashcards" ||
    pathname?.startsWith("/flashcards/");
  if (!onFlashcardsRoute) return null;

  if (count === 0) {
    return (
      <Link
        href="/flashcards/review"
        className="hdr-due-indicator hdr-due-indicator--empty"
        aria-label="Không có thẻ nào đến hạn ôn"
        title="Hiện không có thẻ nào đến hạn — vào để xem"
      >
        <Bell size={14} />
      </Link>
    );
  }

  return (
    <Link
      href="/flashcards/review"
      className="hdr-due-indicator"
      aria-label={`Có ${count} thẻ đến hạn ôn — bấm để bắt đầu`}
      title={`Ôn ${count} thẻ đến hạn từ tất cả bộ`}
    >
      <Zap size={14} />
      <span className="hdr-due-indicator-text">Ôn tập</span>
      <span className="hdr-due-indicator-badge">{count}</span>
    </Link>
  );
}