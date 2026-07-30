/**
 * Decorations - Wall Decorations
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function WallClock({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.06 : WORLD.CORRIDOR_WIDTH / 2 - 0.06;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 3.2, z]} rotation={[0, rotationY, 0]}>
      {/* Clock frame */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Clock face */}
      <mesh position={[0, 0, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.01, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Hour hand */}
      <mesh position={[0, 0.05, 0.03]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.015, 0.12, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Minute hand */}
      <mesh position={[0, 0.08, 0.03]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[0.01, 0.18, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Center dot */}
      <mesh position={[0, 0, 0.035]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

export function BulletinBoard({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.06 : WORLD.CORRIDOR_WIDTH / 2 - 0.06;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 2.2, z]} rotation={[0, rotationY, 0]}>
      {/* Board frame */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.6, 1.1, 0.08]} />
        <meshStandardMaterial color="#5c4033" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Board */}
      <mesh>
        <boxGeometry args={[1.5, 1.0, 0.05]} />
        <meshStandardMaterial color="#d97706" roughness={0.95} />
      </mesh>

      {/* Papers/notices */}
      {[[-0.4, 0.2], [0.2, 0.15], [-0.2, -0.2], [0.35, -0.25]].map(([px, py], i) => (
        <mesh key={i} position={[px, py, 0.03]} rotation={[0, 0, (i - 1.5) * 0.1]}>
          <boxGeometry args={[0.3, 0.35, 0.01]} />
          <meshStandardMaterial color={["#fef3c7", "#fef9c3", "#fce7f3", "#e0f2fe"][i]} roughness={0.95} />
        </mesh>
      ))}

      {/* Push pins */}
      {[[-0.4, 0.2], [0.2, 0.15], [-0.2, -0.2], [0.35, -0.25]].map(([px, py], i) => (
        <mesh key={`pin-${i}`} position={[px, py + 0.15, 0.04]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={["#dc2626", "#2563eb", "#16a34a", "#f59e0b"][i]} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Poster({ x, side, title }: { x: number; side: "left" | "right"; title: string }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.04 : WORLD.CORRIDOR_WIDTH / 2 - 0.04;
  const rotationY = side === "left" ? 0 : Math.PI;

  const colors = ["#fef3c7", "#dbeafe", "#fce7f3", "#dcfce7"];
  const colorIndex = Math.abs(Math.floor(x / 10)) % colors.length;

  return (
    <group position={[x, 2.5, z]} rotation={[0, rotationY, 0]}>
      {/* Poster */}
      <mesh>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
        <meshStandardMaterial color={colors[colorIndex]} roughness={0.95} />
      </mesh>

      {/* Poster border */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.55, 0.75, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Poster title bar */}
      <mesh position={[0, 0.3, 0.015]}>
        <boxGeometry args={[0.5, 0.15, 0.01]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function WallDecorations() {
  const decorations: { x: number; side: "left" | "right"; type: "clock" | "bulletin" | "poster" }[] = [];

  // Add clocks
  decorations.push({ x: 18, side: "left", type: "clock" });
  decorations.push({ x: 36, side: "right", type: "clock" });
  decorations.push({ x: 54, side: "left", type: "clock" });

  // Add bulletin boards
  decorations.push({ x: 14, side: "right", type: "bulletin" });
  decorations.push({ x: 32, side: "left", type: "bulletin" });
  decorations.push({ x: 50, side: "right", type: "bulletin" });

  // Add posters
  decorations.push({ x: 22, side: "right", type: "poster" });
  decorations.push({ x: 40, side: "left", type: "poster" });
  decorations.push({ x: 56, side: "right", type: "poster" });

  return (
    <group>
      {decorations.map((d, i) => {
        if (d.type === "clock") return <WallClock key={i} x={d.x} side={d.side} />;
        if (d.type === "bulletin") return <BulletinBoard key={i} x={d.x} side={d.side} />;
        return <Poster key={i} x={d.x} side={d.side} title="" />;
      })}
    </group>
  );
}
