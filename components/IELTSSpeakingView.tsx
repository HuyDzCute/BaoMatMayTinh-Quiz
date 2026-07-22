"use client";

import { Question } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Mic,
  MicOff,
  Square,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { playSfx } from "@/lib/sound";

interface IELTSSpeakingViewProps {
  questions: Question[];
  currentIndex: number;
  /** Per-question state: optional audio (base64 data URL) when recorded. */
  audioAnswers: (string | undefined)[];
  onAudioAnswer: (index: number, audio: string | undefined) => void;
  onPrev: () => void;
  onNext: () => void;
  /** Direct jump to a specific prompt — avoids racing N times `onPrev/onNext`. */
  onJump: (index: number) => void;
  onSubmit: () => void;
  totalSecs: number;
  setName: string;
}

const fmt = (secs: number) => {
  const safe = Math.max(0, Math.min(secs, 60 * 100 - 1));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
};

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Convert a recorded Blob into a base64 data URL so it can be stored in
 * Firestore (which only accepts strings / numbers / objects). The browser
 * will be able to play it back via a regular <audio> element using the
 * same data URL.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type RecState = "idle" | "recording" | "recorded" | "denied" | "unsupported";

type SpeakingUIState = {
  recState: RecState;
  elapsed: number;
  audioUrl: string | undefined;
  saveError?: string;
};

type SpeakingUIAction =
  | { type: "reset"; audioUrl: string | undefined }
  | { type: "start_recording" }
  | { type: "stop_recording"; audioUrl: string }
  | { type: "tick"; elapsed: number }
  | { type: "unsupported" }
  | { type: "denied" }
  | { type: "save_error"; message: string }
  | { type: "reset_timer" };

function speakingUIReducer(state: SpeakingUIState, action: SpeakingUIAction): SpeakingUIState {
  switch (action.type) {
    case "reset":
      return { recState: action.audioUrl ? "recorded" : "idle", elapsed: 0, audioUrl: action.audioUrl, saveError: undefined };
    case "start_recording":
      return { recState: "recording", elapsed: 0, audioUrl: undefined, saveError: undefined };
    case "stop_recording":
      return { recState: "recorded", elapsed: 0, audioUrl: action.audioUrl, saveError: undefined };
    case "tick":
      return { ...state, elapsed: action.elapsed };
    case "unsupported":
      return { recState: "unsupported", elapsed: 0, audioUrl: undefined, saveError: undefined };
    case "denied":
      return { recState: "denied", elapsed: 0, audioUrl: undefined, saveError: undefined };
    case "save_error":
      return { ...state, recState: "idle", saveError: action.message };
    case "reset_timer":
      return { recState: "idle", elapsed: 0, audioUrl: undefined, saveError: undefined };
    default:
      return state;
  }
}

export default function IELTSSpeakingView({
  questions,
  currentIndex,
  audioAnswers,
  onAudioAnswer,
  onPrev,
  onNext,
  onJump,
  onSubmit,
  totalSecs,
  setName,
}: IELTSSpeakingViewProps) {
  const effectiveQuestions: Question[] =
    questions.length > 0 ? questions : [];
  const total = effectiveQuestions.length;
  const isLast = currentIndex === total - 1;
  const currentQ: Question | undefined = effectiveQuestions[currentIndex];
  const currentAudio = audioAnswers[currentIndex];

  const answeredCount = audioAnswers.filter((a) => !!a).length;

  const [uiState, dispatchUI] = useReducer(speakingUIReducer, {
    recState: "idle",
    elapsed: 0,
    audioUrl: undefined,
    saveError: undefined,
  });
  const { recState, elapsed, audioUrl, saveError } = uiState;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const releaseStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Stop any active recording/stream when leaving the prompt or on unmount.
  const stopAll = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    releaseStream();
  }, [releaseStream]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const reRecord = () => {
    onAudioAnswer(currentIndex, undefined);
    dispatchUI({ type: "reset_timer" });
    playSfx("click");
  };

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  // Reset per-question state when the active prompt changes.
  useEffect(() => {
    stopAll();
    dispatchUI({ type: "reset", audioUrl: currentAudio });
  }, [currentAudio, stopAll]);

  // Auto-stop if time runs out for the whole section.
  useEffect(() => {
    if (totalSecs <= 0 && recState === "recording") {
      stopRecording();
      // Distinct chime so the user knows the section timer cut them off.
      playSfx("complete");
    }
  }, [totalSecs, recState, stopRecording]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      dispatchUI({ type: "unsupported" });
      playSfx("wrong");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      dispatchUI({ type: "unsupported" });
      playSfx("wrong");
      return;
    }
    playSfx("click");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType =
        candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        try {
          // Hard cap at ~6MB to avoid blowing up Firestore (1MB doc limit after
          // base64 inflation). Anything larger is almost certainly a runaway
          // recording the user didn't intend.
          if (blob.size > 6 * 1024 * 1024) {
            dispatchUI({
              type: "save_error",
              message: "Bản ghi quá lớn (>6MB). Vui lòng thu lại với thời lượng ngắn hơn.",
            });
            return;
          }
          const b64 = await blobToBase64(blob);
          onAudioAnswer(currentIndex, b64);
          dispatchUI({ type: "stop_recording", audioUrl: b64 });
          playSfx("complete");
        } catch (err) {
          console.warn("[speaking] save failed:", err);
          dispatchUI({
            type: "save_error",
            message: "Không lưu được bản ghi. Vui lòng thử thu lại.",
          });
          playSfx("wrong");
        } finally {
          releaseStream();
        }
      };

      recorder.start();
      startTsRef.current = Date.now();
      dispatchUI({ type: "start_recording" });
      tickIntervalRef.current = setInterval(() => {
        dispatchUI({ type: "tick", elapsed: (Date.now() - startTsRef.current) / 1000 });
      }, 200);
    } catch (err) {
      console.warn("[speaking] getUserMedia failed:", err);
      dispatchUI({ type: "denied" });
      playSfx("wrong");
      releaseStream();
    }
  }, [currentIndex, onAudioAnswer, releaseStream]);

  const timerColor =
    totalSecs <= 60 ? "is-danger" : totalSecs <= 180 ? "is-warning" : "";

  const partLabel = "Phần 1 — Giới thiệu";

  if (total === 0) {
    return (
      <div className="ielts-speaking-page">
        <div className="ielts-speaking-topbar">
          <div className="ielts-speaking-topbar-inner">
            <div className="ielts-brand">
              <div className="ielts-brand-mark">IDP</div>
              <div>
                <div>IELTS Academic</div>
                <div className="ielts-brand-sub">Speaking · {setName}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ielts-speaking-card" style={{ textAlign: "center", padding: "64px 32px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", color: "var(--ielts-ink)", marginBottom: 8 }}>
            Chưa có phần thi Speaking
          </h2>
          <p style={{ color: "var(--ielts-ink-muted)", fontSize: 14 }}>
            Bộ câu hỏi này chưa bao gồm phần Speaking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ielts-speaking-page">
      {/* Topbar */}
      <div className="ielts-speaking-topbar">
        <div className="ielts-speaking-topbar-inner">
          <div className="ielts-brand">
            <div className="ielts-brand-mark">IDP</div>
            <div>
              <div>IELTS Academic</div>
              <div className="ielts-brand-sub">Speaking · {setName}</div>
            </div>
          </div>
          <div className="ielts-topbar-actions">
            <div className="ielts-progress-text" aria-live="polite" aria-atomic="true">
              Đã thu <strong>{answeredCount}</strong> / {total} câu
            </div>
            <div className={`ielts-timer-pill ${timerColor}`}>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{fmt(totalSecs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="ielts-speaking-card">
        {/* Part header */}
        <header className="ielts-speaking-part">
          <div className="ielts-speaking-part-label">
            <Mic size={14} />
            {partLabel}
          </div>
          <p className="ielts-speaking-part-meta">
            Câu hỏi {currentIndex + 1} / {total}
          </p>
        </header>

        {/* Progress dots — show which prompts have been recorded. aria-label
            announces the current position to screen readers. */}
        <div
          role="tablist"
          aria-label="Danh sách câu hỏi Speaking"
          style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}
        >
          {(audioAnswers ?? []).map((audio, i) => {
            const isCurrent = i === currentIndex;
            const label = audio ? `Câu ${i + 1}: đã thu âm` : `Câu ${i + 1}: chưa thu âm`;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={label}
                title={label}
                onClick={() => {
                  playSfx("click");
                  // Jump directly so we don't race N times onPrev/onNext, which
                  // used to flicker the prompt mid-transition.
                  onJump(i);
                }}
                style={{
                  width: "28px", height: "28px",
                  borderRadius: "50%", border: "none",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-jetbrains)",
                  background: isCurrent
                    ? (audio ? "rgba(59,130,246,0.25)" : "rgba(51,65,85,0.4)")
                    : (audio ? "rgba(16,185,129,0.15)" : "rgba(51,65,85,0.3)"),
                  color: isCurrent
                    ? (audio ? "#60a5fa" : "#94a3b8")
                    : (audio ? "#34d399" : "#475569"),
                  outline: isCurrent
                    ? (audio ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(100,116,139,0.4)")
                    : "1px solid transparent",
                  transition: "all 0.15s",
                  boxShadow: isCurrent ? (audio ? "0 0 8px rgba(59,130,246,0.3)" : "none") : "none",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="ielts-speaking-body">
          {/* Prompt block */}
          <div className="ielts-speaking-prompt-wrap">
            <h2 className="ielts-speaking-prompt">{currentQ?.question}</h2>
          </div>

          {/* Bullet hints */}
          {currentQ?.answers && currentQ.answers.length > 0 && (
            <ul className="ielts-speaking-hints">
              {currentQ.answers.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          )}

          {/* Tips panel */}
          <div className="ielts-speaking-tips">
            <div className="ielts-speaking-tips-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Mẹo nhanh
            </div>
            <div className="ielts-speaking-tip-item">
              Bố cục câu trả lời: mở bài — các ý chính — kết bài ngắn gọn.
            </div>
            <div className="ielts-speaking-tip-item">
              Nói với tốc độ tự nhiên — đừng vội vàng hoặc học thuộc kịch bản.
            </div>
            <div className="ielts-speaking-tip-item">
              Dùng ví dụ cụ thể và trải nghiệm cá nhân khi phù hợp.
            </div>
          </div>

          {/* Recording area */}
          <div className="ielts-speaking-record" style={{ marginTop: 20 }}>
            {recState === "unsupported" ? (
              <div className="ielts-speaking-record-warning" role="alert">
                <MicOff size={16} />
                <span>
                  Trình duyệt không hỗ trợ ghi âm. Vui lòng dùng Chrome, Edge
                  hoặc Firefox phiên bản mới nhất để thu âm câu trả lời.
                </span>
              </div>
            ) : recState === "denied" ? (
              <div className="ielts-speaking-record-warning" role="alert">
                <MicOff size={16} />
                <span>
                  Quyền truy cập micro đang bị chặn. Hãy mở cài đặt trình duyệt
                  để cấp quyền micro, sau đó nhấn <em>Ghi lại</em>.
                </span>
              </div>
            ) : saveError ? (
              <div className="ielts-speaking-record-warning" role="alert" aria-live="assertive">
                <MicOff size={16} />
                <span>{saveError}</span>
              </div>
            ) : null}

            <div className="ielts-speaking-record-row">
              {recState === "idle" && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="ielts-btn ielts-btn-primary ielts-speaking-record-btn"
                >
                  <Mic size={16} /> Bắt đầu ghi âm
                </button>
              )}

              {recState === "recording" && (
                <>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="ielts-btn ielts-btn-danger ielts-speaking-record-btn is-recording"
                  >
                    <Square size={14} fill="currentColor" /> Dừng
                  </button>
                  <div className="ielts-speaking-record-timer" aria-live="polite">
                    <span className="ielts-speaking-record-dot" />
                    ĐANG THU · {fmtDuration(elapsed)}
                  </div>
                </>
              )}

              {recState === "recorded" && audioUrl && (
                <>
                  <audio
                    controls
                    src={audioUrl}
                    className="ielts-speaking-audio"
                    aria-label={`Bản ghi âm câu ${currentIndex + 1}`}
                  />
                  <button
                    type="button"
                    onClick={reRecord}
                    className="ielts-btn ielts-btn-secondary"
                  >
                    <RotateCcw size={14} /> Ghi lại
                  </button>
                </>
              )}
            </div>

            <p className="ielts-speaking-record-help">
              {recState === "idle" &&
                "Nhấn Bắt đầu ghi âm, nói trong 1–2 phút, rồi nhấn Dừng. Bản ghi sẽ được lưu cùng lượt thi này."}
              {recState === "recording" &&
                "Đang ghi âm — nói rõ ràng. Nhấn Dừng khi hoàn thành."}
              {recState === "recorded" &&
                "Đã lưu bản ghi. Bạn có thể ghi lại bất kỳ lúc nào trước khi nộp bài."}
              {saveError && "Vui lòng ghi lại để tiếp tục."}
            </p>
          </div>

          {/* Footer actions */}
          <div className="ielts-speaking-footer">
            <div className="ielts-speaking-footer-tip">
              <Clock size={12} />
              Chất lượng quan trọng hơn tốc độ — nói rõ ràng và tự nhiên
            </div>
              <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { playSfx("click"); onPrev(); }}
                disabled={currentIndex === 0}
                className="ielts-btn ielts-btn-secondary"
                style={currentIndex === 0 ? { opacity: 0.4, cursor: "not-allowed" } : {}}
              >
                <ArrowLeft size={14} /> Câu trước
              </button>
              {isLast ? (
                <button
                  onClick={() => { playSfx("click"); onSubmit(); }}
                  className="ielts-btn ielts-btn-success"
                  title={answeredCount === 0 ? "Nộp bài khi chưa thu câu nào" : undefined}
                >
                  <Send size={14} /> Nộp bài
                </button>
              ) : (
                <button
                  onClick={() => { playSfx("click"); onNext(); }}
                  className="ielts-btn ielts-btn-primary"
                >
                  Câu tiếp <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}