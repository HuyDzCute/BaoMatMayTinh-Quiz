/**
 * DEV-ONLY 2.5D Verification Page
 *
 * Renders three scenes:
 *  1. MinimalSideScrollTest — interactive (manual keyboard)
 *  2. LogicVerificationScene — automated scenarios (no input)
 *  3. JumpVerificationScene  — automated jump cycle
 *
 * The LogicVerificationScene and JumpVerificationScene run deterministic
 * scenarios automatically. Visual proof is shown in the DOM panels.
 *
 * `MinimalSideScrollTest` is the canonical refactored scene — it reuses
 * the production-ready SideScrollPlayerStateMachine, CameraController,
 * BoxObstacle, and dev-only mock triggers (MockNPC, MockCollectible,
 * MockQuizTrigger). It does NOT touch production save slots, Firebase,
 * cloud sync, or leaderboard.
 */
"use client";

import dynamic from "next/dynamic";

const MinimalSideScrollTest = dynamic(
  () => import("@/components/dev-test/MinimalSideScrollTest"),
  { ssr: false }
);
const LogicVerificationScene = dynamic(
  () => import("@/components/dev-test/LogicVerificationScene"),
  { ssr: false }
);
const JumpVerificationScene = dynamic(
  () => import("@/components/dev-test/JumpVerificationScene"),
  { ssr: false }
);

export default function TestPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0f1e",
        padding: 24,
        fontFamily: "system-ui",
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 4 }}>
          2.5D Side-Scroll — Final Verification
        </h1>
        <p style={{ color: "#aaa", marginBottom: 24 }}>
          Three scenes. Automated proofs run without user input.
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: "#fbbf24" }}>
            A. Logic Verification (Automated)
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
            Cycles through 5 scenarios. Watch the panel.
          </p>
          <LogicVerificationScene />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: "#60a5fa" }}>
            B. Jump Verification (Automated)
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
            Jumps repeatedly. Watch peak Y match physics formula.
          </p>
          <JumpVerificationScene />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: "#22c55e" }}>
            C. Interactive Test (Manual)
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
            Use arrow keys / A,D / Space.
          </p>
          <MinimalSideScrollTest />
        </section>

        <div
          style={{
            padding: 16,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
            Validation checklist:
          </div>
          <ul style={{ paddingLeft: 20, color: "#cbd5e1" }}>
            <li>Player moves left/right with arrow keys</li>
            <li>Player Z stays at 0.000 (locked)</li>
            <li>Player cannot pass through wall (X = 4 to 5)</li>
            <li>Player cannot pass through desk (X = -5 to -4)</li>
            <li>Player cannot leave level bounds (X = ±14)</li>
            <li>Camera follows player X smoothly</li>
            <li>Camera does NOT rotate (rot = 0,0,0)</li>
            <li>Camera Y and Z remain fixed</li>
            <li>Player always visible on screen</li>
            <li>Jump peak matches v²=u²+2as formula</li>
          </ul>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a
            href="/test-25d/proof"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#22c55e",
              color: "#000",
              fontWeight: "bold",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            View Visual Proof Gallery →
          </a>
        </div>
      </div>
    </main>
  );
}
