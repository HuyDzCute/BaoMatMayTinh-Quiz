"use client";

import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

// Lazy + SSR off vì three.js cần `window`.
const WordRunGame = dynamic(() => import("@/components/game/WordRunGame"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 380,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0f1e",
        color: "#94a3b8",
        borderRadius: 12,
        fontFamily: "var(--font-inter)",
      }}
    >
      Đang tải WebGL…
    </div>
  ),
});

export default function WordRunPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0a0f1e" }}
    >
      <Header />

      <main
        className="flex-1"
        style={{
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
          padding: "24px 16px 40px",
        }}
      >
        <Link
          href="/flashcards"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#60a5fa",
            fontSize: 13,
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          ← Quay lại Flashcards
        </Link>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#60a5fa",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 999,
              padding: "4px 10px",
              marginBottom: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee" }} />
            Trò chơi 3D · MVP v1
          </div>
          <h1
            style={{
              fontFamily: "var(--font-orbitron)",
              color: "#f1f5f9",
              fontSize: 32,
              margin: "0 0 6px 0",
            }}
          >
            WordRun 3D
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, maxWidth: 640 }}>
            Chạy sang phải, nhảy qua chướng ngại vật, ăn coin từ vựng IELTS và trả lời câu hỏi
            nghĩa để ghi điểm. Đúng +10, sai −5 mạng.
          </p>
        </div>

        <WordRunGame />

        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(15,22,45,0.5)",
            border: "1px solid rgba(51,65,85,0.4)",
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#cbd5e1" }}>Cách chơi:</strong> dùng phím{" "}
          <kbd style={kbd}>&larr;</kbd> <kbd style={kbd}>&rarr;</kbd> để chạy,{" "}
          <kbd style={kbd}>Space</kbd> hoặc <kbd style={kbd}>&uarr;</kbd> để nhảy. Thu thập 10
          coin để thắng. Trên mobile dùng nút cảm ứng bên dưới màn hình.
        </div>
      </main>

      <Footer />
    </div>
  );
}

const kbd: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.3)",
  borderRadius: 4,
  color: "#e2e8f0",
  fontSize: 11,
  fontFamily: "var(--font-jetbrains)",
};
