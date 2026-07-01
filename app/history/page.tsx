"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { subscribeHistory, getHistory } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import Footer from "@/components/Footer";
import { QuizResult } from "@/lib/types";
import {
  History, ArrowLeft, ChevronDown, ChevronUp,
  Cloud, CloudOff, CheckCircle, XCircle, MinusCircle,
  TrendingUp, Target, Zap, Award,   Lock, RefreshCw, AlertTriangle
} from "lucide-react";

interface DayGroup {
  label: string;
  items: QuizResult[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }

    if (user.isAnonymous) {
      // Anonymous: chi dung localStorage
      setHistory(getHistory());
      setLoading(false);
      setCloudError(false);
      return;
    }

    // Google user: dung Firestore cloud sync
    let didCancel = false;
    setCloudError(false);

    const unsub = subscribeHistory(user.uid, (cloudHistory) => {
      if (!didCancel) {
        setHistory(cloudHistory);
        setLoading(false);
      }
    });

    // Timeout: neu sau 8s cloud chua tra loi → fallback sang local
    const timeout = setTimeout(() => {
      if (!didCancel && loading) {
        setCloudError(true);
        setHistory(getHistory());
        setLoading(false);
      }
    }, 8000);

    return () => {
      didCancel = true;
      unsub();
      clearTimeout(timeout);
    };
  }, [user, router, retryKey]);

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (pct: number) =>
    pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  const getTierLabel = (pct: number) =>
    pct >= 90 ? "S+" : pct >= 80 ? "S" : pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";

  const getTierConfig = (pct: number) => {
    if (pct >= 90) return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "S+" };
    if (pct >= 80) return { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", label: "S" };
    if (pct >= 70) return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", label: "A" };
    if (pct >= 60) return { color: "#06b6d4", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", label: "B" };
    if (pct >= 50) return { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", label: "C" };
    return { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)", label: "D" };
  };

  const isCloud = user && !user.isAnonymous && !cloudError;

  // Group history by date
  const dayGroups: DayGroup[] = (() => {
    const groups: Record<string, QuizResult[]> = {};
    for (const item of history) {
      const label = formatDate(item.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  })();

  // Stats
  const totalAttempts = history.length;
  const avgScore = totalAttempts > 0
    ? Math.round(history.reduce((s, e) => s + e.percentage, 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...history.map((e) => e.percentage)) : 0;
  const totalTime = history.reduce((s, e) => s + (e.timeSpent || 0), 0);
  const bestTier = totalAttempts > 0 ? getTierConfig(bestScore) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="his-back-btn">
            <ArrowLeft size={18} />
          </Link>
          <div className="his-title-group">
            <div className="his-title-icon">
              <History size={18} />
            </div>
            <div>
              <h1 className="his-title">Lich Su Thi</h1>
              <p className="his-title-sub">
                {isCloud ? "Dong bo tuyen tinh" : "Du lieu cuc bo"}
              </p>
            </div>
          </div>
          {!loading && history.length > 0 && (
            <span className="his-count-badge">
              {history.length} lan thi
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>
            <span className={`his-cloud-pill ${isCloud ? "his-cloud-on" : "his-cloud-off"}`}>
              {isCloud ? <Cloud size={11} /> : <CloudOff size={11} />}
              <span className="hidden sm:inline">{isCloud ? "Cloud" : "Local"}</span>
            </span>
          </div>
        </div>

        {user?.isAnonymous && !loading && (
          <div className="his-sync-hint" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span>Lich su duoc luu cuc bo tren may nay. <button onClick={() => signInWithGoogle()} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" }}>Dang nhap Google</button> de dong bo tren nhieu thiet bi.</span>
          </div>
        )}

        {cloudError && !user?.isAnonymous && (
          <div className="his-sync-hint" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <RefreshCw size={14} style={{ color: "#f87171", flexShrink: 0 }} />
            <span>Khong ket noi duoc cloud — hien thi du lieu cuc bo. <button onClick={() => { setLoading(true); setCloudError(false); setRetryKey((k) => k + 1); }} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" }}>Thu lai</button></span>
          </div>
        )}

        {/* ── Stats Bar ── */}
        {!loading && history.length > 0 && (
          <div className="his-stats-bar">
            <div className="his-stat-item">
              <div className="his-stat-icon" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#22d3ee" }}>
                <Zap size={14} />
              </div>
              <div>
                <p className="his-stat-value" style={{ color: "#22d3ee" }}>{totalAttempts}</p>
                <p className="his-stat-label">Lan thi</p>
              </div>
            </div>
            <div className="his-stat-divider" />
            <div className="his-stat-item">
              <div className="his-stat-icon" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
                <Target size={14} />
              </div>
              <div>
                <p className="his-stat-value" style={{ color: "#34d399" }}>{bestScore}%</p>
                <p className="his-stat-label">Diem cao nhat</p>
              </div>
            </div>
            <div className="his-stat-divider" />
            <div className="his-stat-item">
              <div className="his-stat-icon" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                <TrendingUp size={14} />
              </div>
              <div>
                <p className="his-stat-value" style={{ color: "#60a5fa" }}>{avgScore}%</p>
                <p className="his-stat-label">Diem TB</p>
              </div>
            </div>
            <div className="his-stat-divider" />
            <div className="his-stat-item">
              <div className="his-stat-icon" style={{ background: bestTier ? `${bestTier.bg}` : "rgba(100,116,139,0.1)", border: bestTier ? `1px solid ${bestTier.border}` : "1px solid rgba(100,116,139,0.25)", color: bestTier ? bestTier.color : "#94a3b8" }}>
                <Award size={14} />
              </div>
              <div>
                <p className="his-stat-value" style={{ color: bestTier ? bestTier.color : "#94a3b8" }}>
                  {bestTier ? bestTier.label : "—"}
                </p>
                <p className="his-stat-label">Grade tot nhat</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-3">
            <div className="his-stats-bar" style={{ height: "68px", marginBottom: "16px" }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="his-card-skeleton" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && history.length === 0 && (
          <div className="his-empty-state">
            <div className="his-empty-icon">
              <History size={40} />
            </div>
            <p className="his-empty-title">Chua co lich su thi</p>
            <p className="his-empty-sub">
              {isCloud
                ? "Hay bat dau thi de dong bo lich su len cloud!"
                : "Hay bat dau thi de xem lich su tai day!"}
            </p>
            <Link href="/" className="his-cta-btn">
              Bat dau thi ngay
            </Link>
          </div>
        )}

        {/* ── Timeline ── */}
        {!loading && history.length > 0 && (
          <div className="his-timeline">
            {dayGroups.map((group, gi) => (
              <div key={group.label} className="his-day-group">
                <div className="his-day-header">
                  <div className="his-day-dot" />
                  <div className="his-day-line" />
                  <span className="his-day-label">{group.label}</span>
                  <div className="his-day-line-right" />
                  <span className="his-day-count">{group.items.length} lan</span>
                </div>

                <div className="his-day-cards">
                  {group.items.map((item, idx) => {
                    const isExpanded = expandedId === item.id;
                    const scoreColor = getScoreColor(item.percentage);
                    const tier = getTierConfig(item.percentage);
                    const skipCount = item.answers.filter((a) => a === -1).length;
                    const progress = (item.correctCount / item.totalQuestions) * 100;
                    const wrongProgress = (item.wrongCount / item.totalQuestions) * 100;
                    const skipProgress = (skipCount / item.totalQuestions) * 100;

                    return (
                      <div
                        key={item.id}
                        className={`his-card ${isExpanded ? "his-card-expanded" : ""}`}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <button
                          className="his-card-header"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          {/* Left: tier badge + score */}
                          <div className="his-card-left">
                            <div className="his-tier-badge" style={{ background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color }}>
                              {tier.label}
                            </div>
                            <div className="his-score-circle-wrap">
                              <svg className="his-score-ring" viewBox="0 0 44 44" width="44" height="44">
                                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="3" />
                                <circle
                                  cx="22" cy="22" r="18"
                                  fill="none"
                                  stroke={scoreColor}
                                  strokeWidth="3"
                                  strokeDasharray={`${2 * Math.PI * 18}`}
                                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - item.percentage / 100)}`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 22 22)"
                                  style={{ filter: `drop-shadow(0 0 4px ${scoreColor}60)` }}
                                />
                              </svg>
                              <span className="his-score-ring-pct" style={{ color: scoreColor }}>
                                {item.percentage}%
                              </span>
                            </div>
                          </div>

                          {/* Center: info */}
                          <div className="his-card-center">
                            <p className="his-card-setname">{item.setName}</p>
                            <div className="his-card-meta">
                              <span className="his-meta-chip" style={{ background: "rgba(16,185,129,0.10)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <CheckCircle size={10} />
                                {item.correctCount} dung
                              </span>
                              <span className="his-meta-chip" style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <XCircle size={10} />
                                {item.wrongCount} sai
                              </span>
                              {skipCount > 0 && (
                                <span className="his-meta-chip" style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.15)" }}>
                                  <MinusCircle size={10} />
                                  {skipCount} bo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: score + time + chevron */}
                          <div className="his-card-right">
                            <div className="his-card-score-block hidden sm:block">
                              <p className="his-card-score" style={{ color: scoreColor }}>
                                {item.score} diem
                              </p>
                              <p className="his-card-time">
                                {item.timeSpent > 0 ? formatTime(item.timeSpent) : "—"}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ color: "#3b82f6", flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ color: "#475569", flexShrink: 0 }} />
                            )}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="his-card-detail">
                            <div className="his-detail-divider" />
                            <p className="his-detail-label">Chi tiet ket qua</p>
                            <div className="his-detail-bar-wrap">
                              {/* Correct */}
                              <div className="his-detail-bar-row">
                                <div className="his-detail-bar-icon" style={{ color: "#10b981" }}>
                                  <CheckCircle size={13} />
                                </div>
                                <span className="his-detail-bar-name">Dung</span>
                                <div className="his-detail-bar-track">
                                  <div
                                    className="his-detail-bar-fill"
                                    style={{
                                      width: `${progress}%`,
                                      background: "linear-gradient(90deg, #10b981, #34d399)",
                                      boxShadow: "0 0 8px rgba(16,185,129,0.4)"
                                    }}
                                  />
                                </div>
                                <span className="his-detail-bar-val" style={{ color: "#10b981" }}>
                                  {item.correctCount}/{item.totalQuestions}
                                </span>
                              </div>
                              {/* Wrong */}
                              <div className="his-detail-bar-row">
                                <div className="his-detail-bar-icon" style={{ color: "#ef4444" }}>
                                  <XCircle size={13} />
                                </div>
                                <span className="his-detail-bar-name">Sai</span>
                                <div className="his-detail-bar-track">
                                  <div
                                    className="his-detail-bar-fill"
                                    style={{
                                      width: `${wrongProgress}%`,
                                      background: "linear-gradient(90deg, #ef4444, #f87171)",
                                      boxShadow: "0 0 8px rgba(239,68,68,0.4)"
                                    }}
                                  />
                                </div>
                                <span className="his-detail-bar-val" style={{ color: "#ef4444" }}>
                                  {item.wrongCount}/{item.totalQuestions}
                                </span>
                              </div>
                              {/* Skip */}
                              {skipCount > 0 && (
                                <div className="his-detail-bar-row">
                                  <div className="his-detail-bar-icon" style={{ color: "#94a3b8" }}>
                                    <MinusCircle size={13} />
                                  </div>
                                  <span className="his-detail-bar-name">Bo trong</span>
                                  <div className="his-detail-bar-track">
                                    <div
                                      className="his-detail-bar-fill"
                                      style={{
                                        width: `${skipProgress}%`,
                                        background: "linear-gradient(90deg, #64748b, #94a3b8)"
                                      }}
                                    />
                                  </div>
                                  <span className="his-detail-bar-val" style={{ color: "#94a3b8" }}>
                                    {skipCount}/{item.totalQuestions}
                                  </span>
                                </div>
                              )}
                            </div>
                            {item.timeSpent > 0 && (
                              <p className="his-detail-time">
                                Thoi gian lam bai: <strong style={{ color: "#60a5fa" }}>{formatTime(item.timeSpent)}</strong>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
