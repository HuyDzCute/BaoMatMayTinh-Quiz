"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { subscribeLeaderboard } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import Footer from "@/components/Footer";
import { LeaderboardEntry } from "@/lib/types";
import { Trophy, ArrowLeft, Medal, Crown, Filter, Cloud, CloudOff, Users, Target, TrendingUp, RefreshCw } from "lucide-react";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filterSet, setFilterSet] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showCount, setShowCount] = useState(10);
  const [cloudError, setCloudError] = useState(false);
  const { isCloudEnabled, user } = useAuth();

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let didCancel = false;
    setCloudError(false);

    const unsub = subscribeLeaderboard((data) => {
      if (!didCancel) {
        setEntries(data);
        setLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      if (!didCancel && loading) {
        setCloudError(true);
        setLoading(false);
      }
    }, 8000);

    return () => {
      didCancel = true;
      unsub();
      clearTimeout(timeout);
    };
  }, [retryKey]);

  const handleRetry = () => {
    setLoading(true);
    setCloudError(false);
    setRetryKey((k) => k + 1);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const uniqueSets = Array.from(new Set(entries.map((e) => e.setName)));
  const filtered = filterSet === "all" ? entries : entries.filter((e) => e.setName === filterSet);
  const visible = filtered.slice(0, showCount);
  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3, showCount);

  const handleFilterChange = (set: string) => {
    setFilterSet(set);
    setShowCount(10);
  };

  const getScoreColor = (pct: number) =>
    pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  const getTierLabel = (pct: number) =>
    pct >= 90 ? "S+" : pct >= 80 ? "S" : pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";

  const getTierColor = (pct: number) =>
    pct >= 90 ? "#f59e0b" : pct >= 80 ? "#10b981" : pct >= 70 ? "#3b82f6" : pct >= 60 ? "#06b6d4" : "#94a3b8";

  const totalPlayers = filtered.length;
  const avgScore = totalPlayers > 0
    ? Math.round(filtered.reduce((s, e) => s + e.percentage, 0) / totalPlayers)
    : 0;
  const topScore = totalPlayers > 0 ? filtered[0].percentage : 0;

  // Find current user's entry and rank
  const myUid = user?.uid && !user.isAnonymous ? user.uid : null;
  const myRank = myUid ? filtered.findIndex((e) => e.uid === myUid) + 1 : 0;
  const myEntry = myRank > 0 ? filtered[myRank - 1] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="lb-back-btn">
            <ArrowLeft size={18} />
          </Link>
          <div className="lb-title-group">
            <div className="lb-title-icon">
              <Trophy size={18} />
            </div>
            <div>
              <h1 className="lb-title">Bang Xep Hang</h1>
              <p className="lb-title-sub">
                {cloudError ? (
                  "Du lieu cuc bo"
                ) : isCloudEnabled ? (
                  <span className="flex items-center gap-1">
                    <span className="lb-live-dot" />
                    Dong bo tuyen tinh
                  </span>
                ) : (
                  "Du lieu cuc bo"
                )}
              </p>
            </div>
          </div>
          <div className={`lb-cloud-pill ${cloudError ? "" : (isCloudEnabled ? "lb-cloud-on" : "lb-cloud-off")}`}
            style={cloudError ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" } : {}}>
            {isCloudEnabled && !cloudError ? <Cloud size={11} /> : <CloudOff size={11} />}
            <span className="hidden sm:inline">{isCloudEnabled && !cloudError ? "Live" : "Local"}</span>
          </div>
        </div>

        {cloudError && (
          <div className="lb-cloud-pill" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", marginLeft: "auto", marginBottom: 12, width: "100%", justifyContent: "center" }}>
            <RefreshCw size={11} />
            <span>Khong ket noi cloud — hien thi du lieu cuc bo. <button onClick={handleRetry} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" }}>Thu lai</button></span>
          </div>
        )}

        {user && (
          <div className="lb-me-banner">
            <Crown size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span>Chao <strong>{user.displayName}</strong>! Kha nang thi cua ban se duoc ghi nhan ngay.</span>
          </div>
        )}

        {/* ── Stats Bar ── */}
        {!loading && filtered.length > 0 && (
          <div className="lb-stats-bar">
            <div className="lb-stat-card">
              <div className="lb-stat-icon" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                <Users size={14} />
              </div>
              <div>
                <p className="lb-stat-value" style={{ color: "#60a5fa" }}>{totalPlayers}</p>
                <p className="lb-stat-label">Nguoi choi</p>
              </div>
            </div>
            <div className="lb-stat-divider" />
            <div className="lb-stat-card">
              <div className="lb-stat-icon" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
                <Target size={14} />
              </div>
              <div>
                <p className="lb-stat-value" style={{ color: "#34d399" }}>{topScore}%</p>
                <p className="lb-stat-label">Diem cao nhat</p>
              </div>
            </div>
            <div className="lb-stat-divider" />
            <div className="lb-stat-card">
              <div className="lb-stat-icon" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#22d3ee" }}>
                <TrendingUp size={14} />
              </div>
              <div>
                <p className="lb-stat-value" style={{ color: "#22d3ee" }}>{avgScore}%</p>
                <p className="lb-stat-label">Diem trung binh</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Filter ── */}
        {entries.length > 0 && uniqueSets.length > 1 && (
          <div className="lb-filter-bar">
            <Filter size={13} style={{ color: "#64748b", flexShrink: 0 }} />
            <button
              onClick={() => handleFilterChange("all")}
              className={`lb-filter-btn ${filterSet === "all" ? "lb-filter-active" : ""}`}
            >
              Tat ca
            </button>
            {uniqueSets.map((set) => (
              <button
                key={set}
                onClick={() => handleFilterChange(set)}
                className={`lb-filter-btn ${filterSet === set ? "lb-filter-active" : ""}`}
              >
                {set.length > 22 ? set.slice(0, 22) + "..." : set}
              </button>
            ))}
          </div>
        )}

        {/* ── Podium (top 3) ── */}
        {!loading && top3.length >= 3 && (
          <div className="lb-podium-section">
            <div className="lb-podium-row">

              {/* Rank 2 */}
              <div className="lb-podium-card lb-podium-2">
                <div className="lb-podium-avatar lb-podium-avatar-2">
                  <Medal size={20} style={{ color: "#94a3b8" }} />
                </div>
                <div className="lb-podium-shine lb-podium-shine-2" />
                <div className="lb-podium-rank-badge" style={{ background: "linear-gradient(135deg, #64748b, #475569)", color: "#fff" }}>2</div>
                <p className="lb-podium-name">{top3[1].playerName}</p>
                <p className="lb-podium-set">{top3[1].setName.length > 16 ? top3[1].setName.slice(0, 16) + "..." : top3[1].setName}</p>
                <div className="lb-podium-score">
                  <p className="lb-podium-pct" style={{ color: getScoreColor(top3[1].percentage) }}>
                    {top3[1].percentage}%
                  </p>
                  <p className="lb-podium-pts">{top3[1].score} diem</p>
                </div>
                {user?.uid && user.uid !== "anonymous" && top3[1].uid === user.uid && (
                  <span className="lb-you-tag">Ban</span>
                )}
              </div>

              {/* Rank 1 */}
              <div className="lb-podium-card lb-podium-1">
                <div className="lb-podium-crown-wrap">
                  <Crown size={24} style={{ color: "#f59e0b", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.7))" }} />
                </div>
                <div className="lb-podium-avatar lb-podium-avatar-1">
                  <Crown size={22} style={{ color: "#f59e0b" }} />
                </div>
                <div className="lb-podium-shine lb-podium-shine-1" />
                <div className="lb-podium-rank-badge" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}>1</div>
                <p className="lb-podium-name">{top3[0].playerName}</p>
                <p className="lb-podium-set">{top3[0].setName.length > 16 ? top3[0].setName.slice(0, 16) + "..." : top3[0].setName}</p>
                <div className="lb-podium-score">
                  <p className="lb-podium-pct" style={{ color: getScoreColor(top3[0].percentage) }}>
                    {top3[0].percentage}%
                  </p>
                  <p className="lb-podium-pts">{top3[0].score} diem</p>
                </div>
                {user?.uid && user.uid !== "anonymous" && top3[0].uid === user.uid && (
                  <span className="lb-you-tag">Ban</span>
                )}
              </div>

              {/* Rank 3 */}
              <div className="lb-podium-card lb-podium-3">
                <div className="lb-podium-avatar lb-podium-avatar-3">
                  <Medal size={20} style={{ color: "#cd7f32" }} />
                </div>
                <div className="lb-podium-shine lb-podium-shine-3" />
                <div className="lb-podium-rank-badge" style={{ background: "linear-gradient(135deg, #cd7f32, #a0522d)", color: "#fff" }}>3</div>
                <p className="lb-podium-name">{top3[2].playerName}</p>
                <p className="lb-podium-set">{top3[2].setName.length > 16 ? top3[2].setName.slice(0, 16) + "..." : top3[2].setName}</p>
                <div className="lb-podium-score">
                  <p className="lb-podium-pct" style={{ color: getScoreColor(top3[2].percentage) }}>
                    {top3[2].percentage}%
                  </p>
                  <p className="lb-podium-pts">{top3[2].score} diem</p>
                </div>
                {user?.uid && user.uid !== "anonymous" && top3[2].uid === user.uid && (
                  <span className="lb-you-tag">Ban</span>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Loading Skeletons ── */}
        {loading && (
          <div className="space-y-3">
            <div className="lb-podium-skeleton-row">
              <div className="lb-podium-skeleton lb-podium-sk-2" />
              <div className="lb-podium-skeleton lb-podium-sk-1" />
              <div className="lb-podium-skeleton lb-podium-sk-3" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="lb-skeleton" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto mb-4" style={{ color: "#334155" }} />
            <p className="lb-empty-title">Chua co ket qua nao</p>
            <p className="lb-empty-sub">Hay thi thu va ghi ten len bang xep hang!</p>
            <Link href="/" className="lb-cta-btn">
              Bat dau thi ngay
            </Link>
          </div>
        )}

        {/* ── Tier cards: rank 4-10 ── */}
        {!loading && rest.length > 0 && (
          <div className="lb-tier-section">
            <div className="lb-tier-header">
              <div className="lb-tier-title-icon">
                <Medal size={13} />
              </div>
              <span className="lb-tier-title-text">Top 10</span>
              <div className="lb-tier-header-line" />
            </div>
            <div className="lb-tier-grid">
              {rest.map((entry, i) => {
                const rank = i + 4;
                const tierColor = getTierColor(entry.percentage);
                return (
                  <div
                    key={`${entry.playerName}-${entry.date}-${rank}`}
                    className="lb-tier-card"
                    style={{
                      animationDelay: `${i * 50}ms`,
                      borderColor: `rgba(${rank <= 5 ? "59,130,246" : "51,65,85"},0.35)`,
                    }}
                  >
                    <div className="lb-tier-rank-wrap">
                      <span className="lb-tier-rank" style={{ color: tierColor }}>#{rank}</span>
                      <div className="lb-tier-rank-line" style={{ backgroundColor: tierColor }} />
                    </div>
                    <div className="lb-tier-info">
                      <p className="lb-tier-name">{entry.playerName}</p>
                      <p className="lb-tier-set">{entry.setName.length > 28 ? entry.setName.slice(0, 28) + "..." : entry.setName}</p>
                    </div>
                    <div className="lb-tier-right">
                      <div className="lb-tier-tier-badge" style={{ background: `${tierColor}15`, border: `1px solid ${tierColor}40`, color: tierColor }}>
                        {getTierLabel(entry.percentage)}
                      </div>
                      <p className="lb-tier-pct" style={{ color: getScoreColor(entry.percentage) }}>
                        {entry.percentage}%
                      </p>
                      <p className="lb-tier-pts">{entry.score} diem</p>
                    </div>
                    {user?.uid && user.uid !== "anonymous" && entry.uid === user.uid && (
                      <span className="lb-you-tag">Ban</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── My rank banner ── */}
        {!loading && myEntry && myRank > 10 && (
          <div className="lb-my-rank-banner">
            <div className="lb-my-rank-badge">#{myRank}</div>
            <div className="lb-my-rank-info">
              <p className="lb-my-rank-name">
                {user?.displayName ?? myEntry.playerName}
                <span className="lb-you-tag" style={{ marginLeft: 6, fontSize: "0.6rem" }}>Ban</span>
              </p>
              <p className="lb-my-rank-set">{myEntry.setName}</p>
            </div>
            <div className="lb-my-rank-score">
              <p className="lb-my-rank-pct" style={{ color: getScoreColor(myEntry.percentage) }}>
                {myEntry.percentage}%
              </p>
              <p className="lb-my-rank-pts">{myEntry.score} diem</p>
            </div>
          </div>
        )}

        {/* ── Load more ── */}
        {!loading && filtered.length > 10 && (
          <div className="lb-load-more-wrap">
            <p className="lb-load-more-count">
              Hien thi {Math.min(showCount, filtered.length)} / {filtered.length} nguoi choi
            </p>
            {visible.length < filtered.length && (
              <button
                onClick={() => setShowCount((v) => v + 10)}
                className="lb-load-more-btn"
              >
                <span>Xem them {Math.min(10, filtered.length - showCount)} nguoi</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
