/**
 * WordRun3D — HUD Module
 *
 * Feature 7: Professional Game HUD
 * - Floating notifications (+10, Combo x2, Wrong)
 * - Smooth animations
 * - Animated hearts
 * - Score counter
 * - Combo display
 * - Progress bar
 * - NPC counter
 * - Pause button
 * - Responsive UI
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState } from "@/lib/wordrun-types";

// ─── Notification system ────────────────────────────────────────────────────────
interface Notification {
  id: number;
  text: string;
  color: string;
  icon: string;
}

let notifId = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const push = useCallback((text: string, color: string, icon: string) => {
    const id = ++notifId;
    setNotifications((prev) => [...prev, { id, text, color, icon }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 1800);
  }, []);

  return { notifications, push };
}

// ─── Floating notifications ────────────────────────────────────────────────────
function FloatingNotifications({ notifications }: { notifications: Notification[] }) {
  return (
    <>
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            pointerEvents: "none",
            animation: "floatUp 1.8s ease forwards",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 999,
              background: `${n.color}22`,
              border: `1px solid ${n.color}88`,
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 24px ${n.color}44`,
            }}
          >
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span
              style={{
                color: n.color,
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "var(--font-orbitron, monospace)",
                letterSpacing: "0.05em",
              }}
            >
              {n.text}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── CSS Animations ─────────────────────────────────────────────────────────────
const ANIMATION_STYLE = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes floatUp {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  15% { opacity: 1; transform: translateX(-50%) translateY(0); }
  75% { opacity: 1; transform: translateX(-50%) translateY(-30px); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
}
@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}
@keyframes comboGlow {
  0%, 100% { box-shadow: 0 0 8px #f97316; }
  50% { box-shadow: 0 0 20px #f97316, 0 0 40px #f9731644; }
}
@keyframes scoreBump {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

// ─── Heart icon ────────────────────────────────────────────────────────────────
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "#475569"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ─── Animated heart display ────────────────────────────────────────────────────
function HeartsDisplay({ lives, maxLives = 3 }: { lives: number; maxLives?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: maxLives }).map((_, i) => (
        <div
          key={i}
          style={{
            animation: i < lives ? "heartPulse 1.5s ease-in-out infinite" : "none",
            animationDelay: `${i * 0.2}s`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <HeartIcon filled={i < lives} />
        </div>
      ))}
    </div>
  );
}

// ─── Animated score counter ───────────────────────────────────────────────────
function AnimatedScore({ score }: { score: number }) {
  const prevRef = useRef(score);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (score !== prevRef.current) {
      prevRef.current = score;
      setBump(true);
      setTimeout(() => setBump(false), 300);
    }
  }, [score]);

  return (
    <span
      style={{
        animation: bump ? "scoreBump 0.3s ease" : "none",
        display: "inline-block",
      }}
    >
      {score.toLocaleString()}
    </span>
  );
}

// ─── Combo display ─────────────────────────────────────────────────────────────
function ComboDisplay({ combo }: { combo: number }) {
  if (combo <= 1) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: "rgba(249,115,22,0.15)",
        border: "1px solid rgba(249,115,22,0.5)",
        backdropFilter: "blur(8px)",
        animation: "comboGlow 1s ease-in-out infinite",
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: 16 }}>⚡</span>
      <span
        style={{
          color: "#fb923c",
          fontSize: 14,
          fontWeight: 800,
          fontFamily: "var(--font-orbitron, monospace)",
          letterSpacing: "0.05em",
        }}
      >
        {combo}x
      </span>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ collected, total }: { collected: number; total: number }) {
  const pct = total > 0 ? (collected / total) * 100 : 0;
  return (
    <div
      style={{
        width: "100%",
        height: 8,
        borderRadius: 999,
        background: "rgba(148,163,184,0.1)",
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.15)",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
          borderRadius: 999,
          transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 0 12px #fbbf24, 0 0 24px #fbbf2444",
          position: "relative",
        }}
      >
        {/* Shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: pct > 0 ? "shimmer 2s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── NPC Counter ──────────────────────────────────────────────────────────────
function NPCCounter({ collected, total }: { collected: number; total: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(34,211,238,0.1)",
        border: "1px solid rgba(34,211,238,0.3)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ fontSize: 14 }}>📚</span>
      <span
        style={{
          color: "#22d3ee",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        {collected}/{total}
      </span>
    </div>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ fontSize: 16 }}>🏆</span>
      <span
        style={{
          color: "#fbbf24",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        <AnimatedScore score={score} />
      </span>
    </div>
  );
}

// ─── Pause button ──────────────────────────────────────────────────────────────
function PauseButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      aria-label="Pause"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: `1px solid ${hovered ? "rgba(59,130,246,0.6)" : "rgba(148,163,184,0.2)"}`,
        background: hovered ? "rgba(59,130,246,0.2)" : "rgba(15,22,45,0.88)",
        color: hovered ? "#60a5fa" : "#94a3b8",
        fontSize: 16,
        cursor: "pointer",
        zIndex: 5,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "all 0.15s ease",
      }}
    >
      ⏸
    </button>
  );
}

// ─── Touch controls ───────────────────────────────────────────────────────────
function TouchButton({
  label,
  onDown,
  onUp,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        setPressed(true);
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        setPressed(false);
        onUp();
      }}
      onPointerLeave={() => {
        setPressed(false);
        onUp();
      }}
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        border: `1px solid ${pressed ? "rgba(59,130,246,0.7)" : "rgba(59,130,246,0.35)"}`,
        background: pressed ? "rgba(59,130,246,0.3)" : "rgba(15,22,45,0.7)",
        color: pressed ? "#60a5fa" : "#e2e8f0",
        fontSize: 22,
        fontWeight: 700,
        cursor: "pointer",
        userSelect: "none",
        touchAction: "manipulation",
        backdropFilter: "blur(8px)",
        transition: "all 0.1s ease",
        transform: pressed ? "scale(0.93)" : "scale(1)",
      }}
    >
      {label}
    </button>
  );
}

// ─── HUD ───────────────────────────────────────────────────────────────────────
export function GameHUD({
  state,
  onRestart,
  onPause,
  inputRef,
  notifications,
}: {
  state: GameState;
  onRestart: () => void;
  onPause: () => void;
  inputRef: React.MutableRefObject<{ left: boolean; right: boolean; jump: boolean }>;
  notifications: Notification[];
}) {
  const { score, lives, combo, collected, totalCoins, status } = state;

  return (
    <>
      {/* Global animations */}
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLE }} />

      {/* Floating notifications */}
      <FloatingNotifications notifications={notifications} />

      {/* Top-left: Score + Hearts + Combo */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ScoreBadge score={score} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(15,22,45,0.88)",
              border: "1px solid rgba(239,68,68,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            <HeartsDisplay lives={lives} />
          </div>
          <ComboDisplay combo={combo} />
        </div>

        {/* Progress + NPC counter */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NPCCounter collected={collected} total={totalCoins} />
          </div>
          <ProgressBar collected={collected} total={totalCoins} />
        </div>
      </div>

      {/* Top-right: Pause + Controls hint */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          zIndex: 5,
        }}
      >
        {status === "playing" && (
          <PauseButton onClick={onPause} />
        )}
        {/* Controls hint */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(15,22,45,0.7)",
            border: "1px solid rgba(148,163,184,0.15)",
            backdropFilter: "blur(8px)",
            color: "#64748b",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-inter, sans-serif)",
            animation: "slideInRight 0.4s ease",
          }}
        >
          <span>←</span>
          <span>→</span>
          <span>Space</span>
          <span>E</span>
        </div>
      </div>

      {/* Touch controls (mobile) */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          zIndex: 5,
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <TouchButton
            label="◀"
            onDown={() => { inputRef.current.left = true; }}
            onUp={() => { inputRef.current.left = false; }}
          />
          <TouchButton
            label="▶"
            onDown={() => { inputRef.current.right = true; }}
            onUp={() => { inputRef.current.right = false; }}
          />
        </div>
        <TouchButton
          label="⬆"
          onDown={() => { inputRef.current.jump = true; }}
          onUp={() => { inputRef.current.jump = false; }}
        />
      </div>

      {/* Win/Lose overlay */}
      {status === "won" && (
        <EndScreen
          won
          score={score}
          combo={combo}
          total={totalCoins}
          onRestart={onRestart}
        />
      )}
      {status === "lost" && (
        <EndScreen won={false} score={score} combo={combo} total={totalCoins} onRestart={onRestart} />
      )}
    </>
  );
}

// ─── End screen ───────────────────────────────────────────────────────────────
function EndScreen({
  won,
  score,
  combo,
  total,
  onRestart,
}: {
  won: boolean;
  score: number;
  combo: number;
  total: number;
  onRestart: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(2,6,23,0.9)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 15,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "36px 48px",
          background: won
            ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(15,23,42,0.98) 60%)"
            : "linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(15,23,42,0.98) 60%)",
          borderRadius: 20,
          border: `1px solid ${won ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          boxShadow: `0 40px 100px ${won ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"}`,
          minWidth: 300,
          maxWidth: 380,
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 72, marginBottom: 16 }}>
          {won ? "🏆" : "💔"}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "var(--font-orbitron, monospace)",
            color: won ? "#86efac" : "#fca5a5",
            margin: "0 0 6px 0",
            fontSize: 28,
            letterSpacing: "0.05em",
          }}
        >
          {won ? "VICTORY!" : "GAME OVER"}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            color: "#64748b",
            margin: "0 0 24px 0",
            fontSize: 13,
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          {won ? "Bạn đã hoàn thành tất cả!" : "Hết mạng rồi!"}
        </p>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <StatChip icon="🏆" label="Điểm" value={score.toString()} color="#fbbf24" />
          <StatChip icon="⚡" label="Combo" value={`${combo}x`} color="#f97316" />
          <StatChip icon="📚" label="Hoàn thành" value={`${total}/${total}`} color="#22d3ee" />
          <StatChip icon="🎯" label="Độ chính xác" value={won ? "100%" : "—"} color="#a78bfa" />
        </div>

        {/* Play Again button */}
        <button
          type="button"
          onClick={onRestart}
          style={{
            width: "100%",
            padding: "14px 32px",
            borderRadius: 12,
            background: won
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "white",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            boxShadow: `0 0 24px ${won ? "rgba(34,197,94,0.4)" : "rgba(59,130,246,0.4)"}`,
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Chơi lại
        </button>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        borderRadius: 10,
        background: `${color}11`,
        border: `1px solid ${color}33`,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span
          style={{
            color: "#64748b",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "var(--font-inter, sans-serif)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          color,
          fontSize: 18,
          fontWeight: 800,
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
