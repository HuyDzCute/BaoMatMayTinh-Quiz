"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { playSfx } from "@/lib/sound";

// YYYY-MM-DD in the user's *local* timezone. `toISOString().slice(0, 10)`
// returns UTC, which makes a user in UTC+7 reviewing at 22:00 local appear
// to belong to "yesterday" UTC. Storage and the rest of the code already
// use local dates for activity keys, so the UI must match.
function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
import {
  ArrowLeft,
  Flame,
  Trophy,
  Target,
  Layers,
  TrendingUp,
  Calendar,
  Repeat,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlashcardSetIcon from "@/components/FlashcardSetIcon";
import {
  getOverallStats,
  getSetStats,
  getDailyActivity,
  getAllFlashcardSets,
  type OverallStats,
  type DailyActivity,
} from "@/lib/flashcards-storage";

interface SetRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  new: number;
  learning: number;
  known: number;
  mastery: number;
}

export default function FlashcardStatsPage() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [setRows, setSetRows] = useState<SetRow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrate everything from localStorage on mount
    setStats(getOverallStats());
    setActivity(getDailyActivity(30));
    const allSets = getAllFlashcardSets();
    setSetRows(
      allSets.map((s) => {
        const st = getSetStats(s.id, s.cards.length);
        return {
          id: s.id,
          name: s.name,
          icon: s.icon,
          color: s.color,
          total: st.total,
          new: st.new,
          learning: st.learning,
          known: st.known,
          mastery: st.mastery,
        };
      }),
    );
    setMounted(true);
  }, []);

  const totals = useMemo(() => {
    const totalCards = setRows.reduce((a, r) => a + r.total, 0);
    const known = setRows.reduce((a, r) => a + r.known, 0);
    const learning = setRows.reduce((a, r) => a + r.learning, 0);
    return {
      totalCards,
      known,
      learning,
      coverage: totalCards === 0 ? 0 : Math.round((known / totalCards) * 100),
    };
  }, [setRows]);

  // Pick top 5 sets with highest learning potential (lowest mastery first, then largest)
  const topRows = useMemo(() => {
    return [...setRows]
      .filter((r) => r.total > 0)
      .sort((a, b) => {
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        return b.total - a.total;
      })
      .slice(0, 8);
  }, [setRows]);

  if (!mounted || !stats) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page" />
        <Footer />
      </div>
    );
  }

  const hasAnyActivity = stats.totalReviews > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />
      <main className="flex-1 fc-page">
        <div className="fc-stats-page">
          <header className="fc-study-header" style={{ marginBottom: 18 }}>
            <Link href="/flashcards" onClick={() => playSfx("click")} className="fc-study-back">
              <ArrowLeft size={13} /> Thư viện
            </Link>
            <div className="fc-study-title-block">
              <h1 className="fc-study-title">Thống kê học tập</h1>
              <p className="fc-study-sub">Theo dõi tiến trình SRS & streak của bạn</p>
            </div>
          </header>

          {!hasAnyActivity ? (
            <div className="fc-empty-state">
              <div className="fc-empty-icon" style={{ width: 72, height: 72, margin: 0 }}>
                <Layers size={32} />
              </div>
              <h2>Chưa có hoạt động nào</h2>
              <p>Hãy mở một bộ thẻ bất kỳ và bắt đầu ôn tập để xem thống kê chi tiết của bạn.</p>
              <div className="fc-empty-actions">
                <Link href="/flashcards" onClick={() => playSfx("click")} className="fc-btn fc-btn-primary">
                  <Repeat size={14} /> Đi tới thư viện
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* HERO STATS */}
              <div className="fc-stats-hero">
                <StatCard
                  icon={<Flame size={16} />}
                  value={stats.streak}
                  label="Streak 🔥"
                  sub={stats.streak === 0 ? "Hãy học hôm nay!" : "ngày liên tiếp"}
                  variant="streak"
                />
                <StatCard
                  icon={<Trophy size={16} />}
                  value={`${totals.coverage}%`}
                  label="Đã thuộc"
                  sub={`${totals.known}/${totals.totalCards} thẻ`}
                  tone="#34d399"
                />
                <StatCard
                  icon={<Target size={16} />}
                  value={`${stats.accuracy}%`}
                  label="Chính xác"
                  sub={`${stats.totalCorrect}/${stats.totalReviews} lượt`}
                  tone="#a78bfa"
                />
                <StatCard
                  icon={<TrendingUp size={16} />}
                  value={stats.avgEase}
                  label="Ease TB"
                  sub="SM-2 (cao = dễ nhớ)"
                  tone="#fb923c"
                />
              </div>

              {/* HEATMAP */}
              <section className="fc-heatmap-card">
                <div className="fc-heatmap-header">
                  <h2 className="fc-heatmap-title">
                    <Calendar size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    Hoạt động 30 ngày qua
                  </h2>
                  <div className="fc-heatmap-legend">
                    <span>Ít</span>
                    <span className="fc-hm-key" style={{ background: "rgba(30,41,59,0.5)" }} />
                    <span className="fc-hm-key" data-level="1" />
                    <span className="fc-hm-key" data-level="2" />
                    <span className="fc-hm-key" data-level="3" />
                    <span className="fc-hm-key" data-level="4" />
                    <span>Nhiều</span>
                  </div>
                </div>
                <div className="fc-hm-grid">
                  {activity.map((d) => {
                    const level =
                      d.reviews === 0
                        ? 0
                        : d.reviews < 5
                          ? 1
                          : d.reviews < 15
                            ? 2
                            : d.reviews < 40
                              ? 3
                              : 4;
                    const today = localDateKey();
                    return (
                      <div
                        key={d.date}
                        className={`fc-hm-cell ${d.date === today ? "is-today" : ""}`}
                        data-level={level > 0 ? level : undefined}
                        title={`${d.date}: ${d.reviews} lượt ôn`}
                      >
                        <span className="fc-hm-tooltip">
                          {d.date}: <b>{d.reviews}</b> lượt
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  Đã ôn <b style={{ color: "#60a5fa" }}>{stats.totalReviews}</b> lượt trong
                  tổng số <b style={{ color: "#f1f5f9" }}>{activity.filter((a) => a.reviews > 0).length}</b> ngày
                </p>
              </section>

              {/* PER-SET TABLE */}
              {topRows.length > 0 && (
                <section className="fc-stats-table">
                  <div style={{ marginBottom: 12 }}>
                    <h2 style={{ fontSize: 14, color: "#e2e8f0", margin: 0 }}>
                      Bộ thẻ cần ôn (ưu tiên mastery thấp)
                    </h2>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Bộ thẻ</th>
                        <th>Tiến trình</th>
                        <th>Mastery</th>
                        <th style={{ textAlign: "right" }}>Ôn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topRows.map((r) => {
                        const studiedPct = r.total === 0 ? 0 : Math.round(((r.learning + r.known) / r.total) * 100);
                        return (
                          <tr key={r.id}>
                            <td>
                              <div className="fc-row-name">
                                <span
                                  className="fc-row-icon"
                                  style={{
                                    background: `${r.color}1f`,
                                    color: r.color,
                                  }}
                                >
                                  <FlashcardSetIcon name={r.icon} size={13} color={r.color} />
                                </span>
                                <span>{r.name}</span>
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  marginTop: 2,
                                  marginLeft: 32,
                                }}
                              >
                                {r.total} thẻ · {r.known} đã thuộc · {r.learning} đang học
                              </div>
                            </td>
                            <td style={{ minWidth: 160 }}>
                              <div className="fc-bar">
                                <div
                                  className="fc-bar-fill"
                                  style={{ width: `${studiedPct}%` }}
                                />
                              </div>
                              <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                                {studiedPct}% đã chạm
                              </div>
                            </td>
                            <td style={{ width: 80 }}>
                              <span style={{ color: "#60a5fa", fontWeight: 600 }}>
                                {r.mastery}%
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Link
                                href={`/flashcards/${encodeURIComponent(r.id)}`}
                                onClick={() => playSfx("click")}
                                className="fc-row-study"
                              >
                                <Repeat size={11} /> Học
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  variant,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub: string;
  variant?: "streak";
  tone?: string;
}) {
  return (
    <div
      className={`fc-stat-card ${variant === "streak" ? "is-streak" : ""}`}
      style={
        tone
          ? ({ ["--stat-glow" as string]: `${tone}33` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="fc-stat-icon">{icon}</div>
      <div className="fc-stat-value">{value}</div>
      <div className="fc-stat-label">{label}</div>
      <div className="fc-stat-sub">{sub}</div>
    </div>
  );
}