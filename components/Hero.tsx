"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Layers, Trophy, Activity } from "lucide-react";
import { quizSets } from "@/lib/data";
import { playSfx } from "@/lib/sound";

/**
 * Count-up animation: from 0 → target in ~1.2s with easeOutCubic.
 */
function useCountUp(target: number, durationMs = 1200, startDelayMs = 400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const start = performance.now() + startDelayMs;
    const tick = (now: number) => {
      if (now < start) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, startDelayMs]);

  return value;
}

type StatCard = {
  tone: "blue" | "cyan" | "emerald";
  label: string;
  value: number;
  unit: string;
  sub: string;
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
};

export default function Hero() {
  const totals = useMemo(() => {
    const totalQuestions = quizSets.reduce((sum, s) => sum + s.questions.length, 0);
    const totalSets = quizSets.length;
    return { totalQuestions, totalSets };
  }, []);

  const cards: StatCard[] = [
    {
      tone: "blue",
      label: "Câu hỏi",
      value: totals.totalQuestions,
      unit: "câu",
      sub: "Ngân hàng đề ôn tập QTHTM",
      href: "/",
      Icon: BookOpen,
    },
    {
      tone: "cyan",
      label: "Đề thi",
      value: totals.totalSets,
      unit: "bộ",
      sub: "Được biên soạn bởi Thầy Sáng",
      href: "/",
      Icon: Layers,
    },
    {
      tone: "emerald",
      label: "Bảng xếp hạng",
      value: 1,
      unit: "live",
      sub: "Top người chơi realtime",
      href: "/leaderboard",
      Icon: Trophy,
    },
  ];

  return (
    <div className="hero-stats-wrapper">
      <div className="hero-stats-border" aria-hidden="true" />
      <div className="hero-stats-bg-glow" aria-hidden="true" />

      <div className="hero-stats-inner">
        {/* Title bar */}
        <div className="hero-stats-title">
          <span className="hero-stats-title-icon" aria-hidden="true">
            <Activity size={11} style={{ color: "#60a5fa" }} />
          </span>
          <span className="hero-stats-title-text">Quiz Stats · Tổng quan</span>
          <span className="hero-stats-title-line" aria-hidden="true" />
          <span className="hero-stats-title-dot" aria-hidden="true" />
        </div>

        {/* 3 stat cards */}
        <div className="hero-stats-grid">
          {cards.map((card) => (
            <StatCardItem key={card.label} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCardItem({ card }: { card: StatCard }) {
  const animated = useCountUp(card.value, 1200, 500);
  const { tone, label, unit, sub, href, Icon } = card;
  return (
    <div className={`hs-card hs-${tone}`}>
      {/* decorative ring around icon */}
      <span className="hs-card-icon-ring" aria-hidden="true" />
      {/* top edge glow */}
      <span className="hs-card-glow" aria-hidden="true" />
      {/* hover shimmer overlay */}
      <span className="hs-card-shimmer" aria-hidden="true" />

      <div className="hs-card-icon">
        <Icon size={16} />
      </div>

      <div className="hs-card-label">{label}</div>

      <div>
        <span className="hs-card-number">{animated}</span>
        <span className="hs-card-unit">{unit}</span>
      </div>

      <div className="hs-card-sub">{sub}</div>

      <div className="hs-card-bar" aria-hidden="true" />

      {/* click-through overlay (only the leaderboard card is linkable) */}
      {href !== "/" ? (
        <Link href={href} onClick={() => playSfx("click")} className="hs-card-link" aria-label={label} />
      ) : null}
    </div>
  );
}