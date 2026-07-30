/**
 * Proof Gallery — renders all 5 SVG visual proofs as inline images.
 * Dev-only. Accessible at /test-25d/proof.
 */
"use client";

export default function ProofGallery() {
  const proofs = [
    { file: "01-start.svg", title: "1. START", desc: "Player at X=0. Camera centered. Z=0 (locked)." },
    { file: "02-middle.svg", title: "2. MIDDLE", desc: "Player at X=-3 (next to collectible). No obstacles in path." },
    { file: "03-wall.svg", title: "3. WALL COLLISION", desc: "Player stopped at X=3.6 (wall.minX − player radius)." },
    { file: "04-desk.svg", title: "4. DESK COLLISION", desc: "Player stopped at X=-3.6 (desk.maxX + player radius)." },
    { file: "05-end.svg", title: "5. END BOUNDARY", desc: "Player at X=13.6 (right edge of world)." },
  ];

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 4 }}>Visual Proof Gallery</h1>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>
          Five static renderings showing player position, camera state, and obstacles.
        </p>

        {proofs.map((p) => (
          <section
            key={p.file}
            style={{
              marginBottom: 32,
              background: "rgba(255,255,255,0.04)",
              padding: 16,
              borderRadius: 12,
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 4, color: "#22c55e" }}>
              {p.title}
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 12 }}>
              {p.desc}
            </p>
            <div
              style={{
                background: "#1a1a2e",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <img
                src={`/proof-25d/${p.file}`}
                alt={p.title}
                style={{ width: "100%", display: "block" }}
              />
            </div>
          </section>
        ))}

        <div
          style={{
            padding: 16,
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8, color: "#22c55e" }}>
            Visual assertions
          </div>
          <ul style={{ paddingLeft: 20, color: "#cbd5e1" }}>
            <li>Player capsule is always upright (Y-axis), never rotates sideways</li>
            <li>Camera CAM marker is always at top-left corner — fixed Z=−10</li>
            <li>Player X coordinates match the labeled value (0, −3, 3.6, −3.6, 13.6)</li>
            <li>Wall and desk geometry is visible at correct world positions</li>
            <li>Player stops at wall edge with no overlap</li>
            <li>Player stops at desk edge with no overlap</li>
            <li>Player clamps to world boundary at X=±13.6</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
