/**
 * Decorations - Signs & Notices
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function RoomSign({ x, side, label, color = "#1e3a8a" }: { x: number; side: "left" | "right"; label: string; color?: string }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.05 : WORLD.CORRIDOR_WIDTH / 2 - 0.05;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 3.0, z]} rotation={[0, rotationY, 0]}>
      {/* Sign background */}
      <mesh>
        <boxGeometry args={[0.8, 0.35, 0.03]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Sign border */}
      <mesh position={[0, 0, 0.016]}>
        <boxGeometry args={[0.75, 0.3, 0.01]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* Label bar */}
      <mesh position={[0, 0.05, 0.02]}>
        <boxGeometry args={[0.6, 0.12, 0.01]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function DirectionalSign({ x, y, rotation, text }: { x: number; y: number; rotation: number; text: string }) {
  return (
    <group position={[x, y, 0]} rotation={[0, rotation, 0]}>
      {/* Sign board */}
      <mesh>
        <boxGeometry args={[0.5, 0.2, 0.02]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* Arrow indicator */}
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[0.15, 0.08, 0.01]} />
        <meshStandardMaterial color="#dc2626" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function VocabPoster({ x, side, word }: { x: number; side: "left" | "right"; word: { en: string; meaning: string } }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.04 : WORLD.CORRIDOR_WIDTH / 2 - 0.04;
  const rotationY = side === "left" ? 0 : Math.PI;
  const colors = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3"];
  const colorIdx = Math.abs(Math.floor(x / 15)) % colors.length;

  return (
    <group position={[x, 2.8, z]} rotation={[0, rotationY, 0]}>
      {/* Poster frame */}
      <mesh>
        <boxGeometry args={[0.7, 0.5, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Poster background */}
      <mesh position={[0, 0, 0.012]}>
        <boxGeometry args={[0.65, 0.45, 0.01]} />
        <meshStandardMaterial color={colors[colorIdx]} roughness={0.95} />
      </mesh>
      {/* Word highlight */}
      <mesh position={[0, 0.12, 0.018]}>
        <boxGeometry args={[0.5, 0.1, 0.005]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.9} />
      </mesh>
      {/* Divider line */}
      <mesh position={[0, -0.02, 0.018]}>
        <boxGeometry args={[0.55, 0.01, 0.005]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function AnnouncementBoard({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.08 : WORLD.CORRIDOR_WIDTH / 2 - 0.08;
  const rotationY = side === "left" ? 0 : Math.PI;

  const papers = [
    { x: -0.35, y: 0.15, w: 0.4, h: 0.25, color: "#fef9c3" },
    { x: 0.1, y: 0.18, w: 0.35, h: 0.3, color: "#e0f2fe" },
    { x: -0.2, y: -0.2, w: 0.45, h: 0.2, color: "#fce7f3" },
    { x: 0.25, y: -0.15, w: 0.3, h: 0.28, color: "#dcfce7" },
  ];

  const pins = [
    { x: -0.35, y: 0.28 },
    { x: 0.1, y: 0.32 },
    { x: -0.2, y: -0.1 },
    { x: 0.25, y: 0.0 },
  ];

  return (
    <group position={[x, 2.0, z]} rotation={[0, rotationY, 0]}>
      {/* Cork board */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.2, 0.9, 0.06]} />
        <meshStandardMaterial color="#92400e" roughness={0.95} />
      </mesh>
      {/* Board surface */}
      <mesh>
        <boxGeometry args={[1.1, 0.8, 0.03]} />
        <meshStandardMaterial color="#d97706" roughness={0.9} />
      </mesh>
      {/* Papers */}
      {papers.map((p, i) => (
        <mesh key={`paper-${i}`} position={[p.x, p.y, 0.02]} rotation={[0, 0, (i - 1.5) * 0.05]}>
          <boxGeometry args={[p.w, p.h, 0.01]} />
          <meshStandardMaterial color={p.color} roughness={0.95} />
        </mesh>
      ))}
      {/* Push pins */}
      {pins.map((p, i) => (
        <mesh key={`pin-${i}`} position={[p.x, p.y, 0.03]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={["#dc2626", "#2563eb", "#16a34a", "#f59e0b"][i]} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function SafetySign({ x, side, type }: { x: number; side: "left" | "right"; type: string }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.05 : WORLD.CORRIDOR_WIDTH / 2 - 0.05;
  const rotationY = side === "left" ? 0 : Math.PI;

  const configs: Record<string, { bg: string; fg: string; icon: string }> = {
    fire: { bg: "#dc2626", fg: "#ffffff", icon: "FIRE" },
    wet: { bg: "#2563eb", fg: "#ffffff", icon: "WET" },
    exit: { bg: "#16a34a", fg: "#ffffff", icon: "EXIT" },
    first_aid: { bg: "#ffffff", fg: "#dc2626", icon: "+" },
  };

  const cfg = configs[type] || configs.exit;

  return (
    <group position={[x, 1.8, z]} rotation={[0, rotationY, 0]}>
      {/* Sign */}
      <mesh>
        <boxGeometry args={[0.35, 0.35, 0.02]} />
        <meshStandardMaterial color={cfg.bg} roughness={0.8} />
      </mesh>
      {/* Border */}
      <mesh position={[0, 0, 0.012]}>
        <boxGeometry args={[0.3, 0.3, 0.01]} />
        <meshStandardMaterial color={cfg.fg} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function HangingSign({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <group position={[x, y, 0]}>
      {/* Sign */}
      <mesh>
        <boxGeometry args={[2.5, 0.5, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Inner panel */}
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[2.3, 0.35, 0.02]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* Chain left */}
      <mesh position={[-1.1, 0.3, 0]}>
        <boxGeometry args={[0.02, 0.3, 0.02]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Chain right */}
      <mesh position={[1.1, 0.3, 0]}>
        <boxGeometry args={[0.02, 0.3, 0.02]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function SignsAndNotices() {
  const roomSigns: { x: number; side: "left" | "right"; label: string; color: string }[] = [
    { x: 10, side: "left", label: "CLASS 1A", color: "#1e3a8a" },
    { x: 10, side: "right", label: "CLASS 1B", color: "#1e3a8a" },
    { x: 28, side: "left", label: "CLASS 2A", color: "#7c3aed" },
    { x: 28, side: "right", label: "CLASS 2B", color: "#7c3aed" },
    { x: 46, side: "left", label: "CLASS 3A", color: "#047857" },
    { x: 46, side: "right", label: "CLASS 3B", color: "#047857" },
  ];

  const hangingSigns: { x: number; y: number; label: string }[] = [
    { x: 19, y: 4.2, label: "LIBRARY →" },
    { x: 37, y: 4.2, label: "CAFETERIA →" },
    { x: 55, y: 4.2, label: "GYM →" },
  ];

  const vocabPosters: { x: number; side: "left" | "right"; word: { en: string; meaning: string } }[] = [
    { x: 6, side: "right", word: { en: "CORRIDOR", meaning: "hành lang" } },
    { x: 14, side: "left", word: { en: "CLASSROOM", meaning: "lớp học" } },
    { x: 22, side: "right", word: { en: "LIBRARY", meaning: "thư viện" } },
    { x: 30, side: "left", word: { en: "CAFETERIA", meaning: "nhà ăn" } },
    { x: 38, side: "right", word: { en: "GYMNASIUM", meaning: "phòng gym" } },
    { x: 46, side: "left", word: { en: "LABORATORY", meaning: "phòng thí nghiệm" } },
    { x: 54, side: "right", word: { en: "AUDITORIUM", meaning: "hội trường" } },
  ];

  const announcementBoards: { x: number; side: "left" | "right" }[] = [
    { x: 16, side: "left" },
    { x: 34, side: "right" },
    { x: 52, side: "left" },
  ];

  const safetySigns: { x: number; side: "left" | "right"; type: string }[] = [
    { x: 8, side: "right", type: "fire" },
    { x: 26, side: "left", type: "exit" },
    { x: 44, side: "right", type: "first_aid" },
  ];

  const floorSigns: { x: number; y: number; rotation: number; text: string }[] = [
    { x: 19, y: 0.02, rotation: 0, text: "LIBRARY" },
    { x: 37, y: 0.02, rotation: 0, text: "CAFETERIA" },
    { x: 55, y: 0.02, rotation: 0, text: "GYM" },
  ];

  return (
    <group>
      {roomSigns.map((rs, i) => <RoomSign key={`room-${i}`} x={rs.x} side={rs.side} label={rs.label} color={rs.color} />)}
      {hangingSigns.map((hs, i) => <HangingSign key={`hang-${i}`} x={hs.x} y={hs.y} label={hs.label} />)}
      {vocabPosters.map((vp, i) => <VocabPoster key={`vocab-${i}`} x={vp.x} side={vp.side} word={vp.word} />)}
      {announcementBoards.map((ab, i) => <AnnouncementBoard key={`announce-${i}`} x={ab.x} side={ab.side} />)}
      {safetySigns.map((ss, i) => <SafetySign key={`safety-${i}`} x={ss.x} side={ss.side} type={ss.type} />)}
      {floorSigns.map((fs, i) => <DirectionalSign key={`floor-${i}`} x={fs.x} y={fs.y} rotation={fs.rotation} text={fs.text} />)}
    </group>
  );
}
