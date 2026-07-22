"use client";
import { useState, useRef } from "react";
import { Question } from "@/lib/types";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Play, Pause, Volume2 } from "lucide-react";

interface AnswerReviewProps {
  questions: Question[];
  /** Accepts both MCQ indices (number) and JSON-stringified match maps (string).
   *  This matches QuizResult.answers which is (number | string)[]. */
  answers: (number | string)[];
  /** IELTS Speaking: per-question audio recordings as base64 data URLs. */
  speakingAnswers?: (string | undefined)[];
}

export default function AnswerReview({ questions, answers, speakingAnswers }: AnswerReviewProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const isSpeaking = Array.isArray(speakingAnswers) && speakingAnswers.some(Boolean);
  const hasAudio = (idx: number) => !!speakingAnswers?.[idx];

  // Audio player mini (inline — no external dependencies needed)
  function AudioPlayerMini({ src }: { src: string }) {
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggle = () => {
      if (!audioRef.current) return;
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setPlaying(!playing);
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => { setPlaying(false); setCurrent(0); }}
        />
        <button
          onClick={toggle}
          style={{ background: "rgba(59,130,246,0.15)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
        >
          {playing
            ? <Pause size={14} style={{ color: "#60a5fa" }} />
            : <Play size={14} style={{ color: "#60a5fa", paddingLeft: "2px" }} />}
        </button>
        <div style={{ flex: 1 }}>
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={current}
            onChange={(e) => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setCurrent(Number(e.target.value)); } }}
            style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer", height: "4px" }}
          />
          <p style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", fontFamily: "var(--font-jetbrains)" }}>
            {duration > 0 ? `${Math.floor(current / 60)}:${String(Math.floor(current % 60)).padStart(2, "0")} / ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "—"}
          </p>
        </div>
        <Volume2 size={13} style={{ color: "#3b82f6", flexShrink: 0 }} />
      </div>
    );
  }

  // Coerce stored answer to a comparable index when it represents an MCQ choice.
  const toChoiceIdx = (a: number | string | undefined): number | null => {
    if (a === undefined || a === null || a === -1 || a === "-1") return null;
    if (typeof a === "string") return null; // JSON match map — handle separately below
    if (Number.isNaN(a)) return null;
    return a;
  };

  // Parse a JSON match map (e.g. '{"0":2,"1":1}') into { itemIdx: optIdx }
  const parseMatchAnswer = (a: number | string | undefined): Record<string, number> | null => {
    if (typeof a !== "string") return null;
    try {
      const v = JSON.parse(a);
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch { /* not JSON */ }
    return null;
  };

  const isMCQCorrect = (q: Question, a: number | string | undefined): boolean => {
    if (typeof q.correct !== "number") return false;
    const idx = toChoiceIdx(a);
    return idx !== null && idx === q.correct;
  };

  const isMCQAnswered = (a: number | string | undefined): boolean => {
    return toChoiceIdx(a) !== null;
  };

  const filteredQuestions = questions
    .map((q, i) => ({ q, i, correct: isMCQCorrect(q, answers[i]) }))
    .filter((item) => {
      if (filter === "correct") return item.correct;
      if (filter === "wrong") return !item.correct;
      return true;
    });

  const LETTERS = ["A", "B", "C", "D"];

  return (
    <div>
      <div role="tablist" aria-label="Lọc câu hỏi" className="flex gap-2 mb-5">
        {(["all", "correct", "wrong"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            style={{
              backgroundColor: filter === f ? "#3b82f6" : "#1e293b",
              color: filter === f ? "#fff" : "#94a3b8",
              border: filter === f ? "none" : "1px solid #334155",
            }}
          >
            {f === "all"
              ? `Tất cả (${questions.length})`
              : isSpeaking
              ? f === "correct"
                ? `Đã thu (${questions.filter((_, i) => hasAudio(i)).length})`
                : `Chưa thu (${questions.filter((_, i) => !hasAudio(i)).length})`
              : f === "correct"
              ? `Đúng (${questions.filter((q, i) => isMCQCorrect(q, answers[i])).length})`
              : `Sai (${questions.filter((q, i) => !isMCQCorrect(q, answers[i])).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredQuestions.map(({ q, i, correct }) => (
          <div
            key={q.id}
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
          >
            <button
              className="w-full px-5 py-4 flex items-center gap-4 text-left"
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: isSpeaking
                    ? hasAudio(i) ? "rgba(59,130,246,0.15)" : "rgba(148,163,184,0.1)"
                    : correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: isSpeaking
                    ? hasAudio(i) ? "#60a5fa" : "#94a3b8"
                    : correct ? "#10b981" : "#ef4444",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {i + 1}
              </div>
              <p className="flex-1 text-sm line-clamp-2" style={{ color: "#f1f5f9" }}>
                {q.question}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isSpeaking ? (
                  hasAudio(i) ? (
                    <Volume2 size={14} style={{ color: "#60a5fa" }} />
                  ) : (
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-jetbrains)" }}>Chưa thu</span>
                  )
                ) : correct ? (
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
                ) : (
                  <XCircle size={16} style={{ color: "#ef4444" }} />
                )}
                {expandedIndex === i ? (
                  <ChevronUp size={16} style={{ color: "#64748b" }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "#64748b" }} />
                )}
              </div>
            </button>

            {expandedIndex === i && (
              <div className="px-5 pb-5 pt-0 space-y-3 animate-fade-slide-up">
                {isSpeaking && speakingAnswers?.[i] ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <Volume2 size={13} style={{ color: "#60a5fa" }} />
                      <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 600 }}>Ban ghi cua ban</span>
                    </div>
                    <AudioPlayerMini src={speakingAnswers[i]!} />
                  </>
                ) : isSpeaking ? (
                  <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(148,163,184,0.06)", border: "1px dashed rgba(148,163,184,0.2)", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>Chua thu am cau nay.</p>
                  </div>
                ) : null}

                {isSpeaking ? null : (
                  <>
                    {q.type === "matching" || q.type === "summary" ? (
                      <div className="space-y-2">
                        {(q.matchItems ?? []).map((item, mi) => {
                          const matchMap = parseMatchAnswer(answers[i]);
                          const selOptIdx = matchMap ? matchMap[String(mi)] : undefined;
                          const selOptLabel = selOptIdx !== undefined ? (q.matchOptions?.[selOptIdx] ?? null) : null;
                          const correctLabel = q.matchCorrect?.[mi];
                          const isCorrect = typeof selOptLabel === "string" && correctLabel !== undefined && selOptLabel.split(".")[0] === correctLabel;
                          return (
                            <div
                              key={mi}
                              className="px-3 py-2 rounded-lg text-xs flex items-start gap-2"
                              style={{
                                backgroundColor: isCorrect ? "rgba(16,185,129,0.1)" : typeof selOptLabel === "string" ? "rgba(239,68,68,0.1)" : "#1e293b",
                                border: `1px solid ${isCorrect ? "#10b981" : typeof selOptLabel === "string" ? "#ef4444" : "#334155"}`,
                                color: isCorrect ? "#10b981" : typeof selOptLabel === "string" ? "#ef4444" : "#64748b",
                              }}
                            >
                              <span className="font-bold flex-shrink-0 mt-0.5">{mi + 1}.</span>
                              <span className="flex-1">{item}</span>
                              <span className="ml-auto flex-shrink-0 mt-0.5">
                                {typeof selOptLabel === "string" ? selOptLabel : <em>—</em>}
                              </span>
                              {isCorrect ? <CheckCircle size={12} /> : typeof selOptLabel === "string" ? <XCircle size={12} /> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {q.answers.map((ans, idx) => {
                          const letter = LETTERS[idx % LETTERS.length];
                          const isCorrect = typeof q.correct === "number" && idx === q.correct;
                          const isSelected = isMCQAnswered(answers[i]) && toChoiceIdx(answers[i]) === idx;
                          const isUserChoice = isSelected && !isCorrect;
                          return (
                            <div
                              key={idx}
                              className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                              style={{
                                backgroundColor: isCorrect ? "rgba(16,185,129,0.1)" : isUserChoice ? "rgba(239,68,68,0.1)" : "#1e293b",
                                border: `1px solid ${isCorrect ? "#10b981" : isUserChoice ? "#ef4444" : "#334155"}`,
                                color: isCorrect ? "#10b981" : isUserChoice ? "#ef4444" : "#64748b",
                              }}
                            >
                              <span className="font-bold">{letter}.</span>
                              <span>{ans}</span>
                              {isCorrect && <CheckCircle size={12} className="ml-auto" />}
                              {isUserChoice && <XCircle size={12} className="ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.explanation && (
                      <div className="p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#94a3b8" }}>
                        <span className="font-semibold" style={{ color: "#06b6d4" }}>Giai thich: </span>
                        {q.explanation}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
