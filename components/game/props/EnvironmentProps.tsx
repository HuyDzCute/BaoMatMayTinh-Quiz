/**
 * Props - Environment Props
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";
import { ColoredLocker } from "../environment/Lockers";

export function Bench({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.6 : WORLD.CORRIDOR_WIDTH / 2 - 0.6;

  return (
    <group position={[x, 0, z]}>
      {/* Seat */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.35]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Backrest */}
      <mesh castShadow position={[0, 0.75, -0.15]}>
        <boxGeometry args={[1.2, 0.4, 0.04]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Legs */}
      {[-0.5, 0.5].map((lx, i) => (
        <mesh key={i} castShadow position={[lx, 0.22, 0.12]}>
          <boxGeometry args={[0.06, 0.44, 0.06]} />
          <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Back supports */}
      {[-0.5, 0.5].map((lx, i) => (
        <mesh key={`back-${i}`} castShadow position={[lx, 0.6, -0.15]}>
          <boxGeometry args={[0.06, 0.35, 0.04]} />
          <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function WaterCooler({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.15 : WORLD.CORRIDOR_WIDTH / 2 - 0.15;

  return (
    <group position={[x, 0, z]}>
      {/* Base cabinet */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.9, 0.4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Water bottle */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.4, 16]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.7} roughness={0.2} />
      </mesh>
      {/* Dispenser head */}
      <mesh position={[0, 0.95, 0.12]}>
        <boxGeometry args={[0.25, 0.08, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Dispenser buttons */}
      <mesh position={[-0.05, 0.93, 0.17]}>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial color="#dc2626" roughness={0.6} />
      </mesh>
      <mesh position={[0.05, 0.93, 0.17]}>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial color="#2563eb" roughness={0.6} />
      </mesh>
      {/* Drip tray */}
      <mesh position={[0, 0.92, 0.15]}>
        <boxGeometry args={[0.2, 0.02, 0.12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function VendingMachine({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.25 : WORLD.CORRIDOR_WIDTH / 2 - 0.25;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.7, 1.8, 0.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Glass panel */}
      <mesh position={[0, 0.4, 0.31]}>
        <boxGeometry args={[0.55, 0.9, 0.02]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Product rows */}
      {[0.2, 0.0, -0.2].map((vy, i) => (
        <group key={`row-${i}`} position={[0, 0.35 + vy, 0.32]}>
          {[-0.2, 0, 0.2].map((vx, j) => (
            <mesh key={`item-${j}`} position={[vx, 0, 0]}>
              <boxGeometry args={[0.12, 0.15, 0.04]} />
              <meshStandardMaterial color={["#dc2626", "#2563eb", "#16a34a"][(i + j) % 3]} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Control panel */}
      <mesh position={[0, -0.5, 0.31]}>
        <boxGeometry args={[0.5, 0.25, 0.04]} />
        <meshStandardMaterial color="#374151" roughness={0.7} />
      </mesh>
      {/* Coin slot */}
      <mesh position={[-0.1, -0.48, 0.34]}>
        <boxGeometry args={[0.06, 0.04, 0.02]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Pickup slot */}
      <mesh position={[0.1, -0.6, 0.34]}>
        <boxGeometry args={[0.15, 0.1, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function PottedPlant({ x, side, scale = 1 }: { x: number; side: "left" | "right"; scale?: number }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.2 : WORLD.CORRIDOR_WIDTH / 2 - 0.2;

  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      {/* Pot */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.3, 12]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 12]} />
        <meshStandardMaterial color="#78350f" roughness={0.95} />
      </mesh>
      {/* Plant leaves */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const leafHeight = 0.5 + (i % 2) * 0.15;
        return (
          <mesh key={`leaf-${i}`} position={[Math.cos(angle) * 0.1, 0.4 + i * 0.08, Math.sin(angle) * 0.1]} rotation={[0.3, angle, 0]}>
            <boxGeometry args={[0.15, 0.25, 0.02]} />
            <meshStandardMaterial color={i < 2 ? "#15803d" : "#22c55e"} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CeilingVent({ x }: { x: number }) {
  return (
    <group position={[x, WORLD.CORRIDOR_HEIGHT - 0.05, 0]}>
      {/* Vent housing */}
      <mesh>
        <boxGeometry args={[0.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Grille slats */}
      {[-0.15, -0.05, 0.05, 0.15].map((vz, i) => (
        <mesh key={`slat-${i}`} position={[0, -0.06, vz]}>
          <boxGeometry args={[0.55, 0.02, 0.03]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export function ACUnit({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.15 : WORLD.CORRIDOR_WIDTH / 2 - 0.15;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 3.5, z]} rotation={[0, rotationY, 0]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[1.0, 0.3, 0.2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Front grille */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.9, 0.22, 0.02]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Vent slats */}
      {[-0.3, -0.1, 0.1, 0.3].map((vy, i) => (
        <mesh key={`slat-${i}`} position={[0, vy, 0.12]}>
          <boxGeometry args={[0.85, 0.02, 0.02]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Brand logo area */}
      <mesh position={[0, 0.08, 0.11]}>
        <boxGeometry args={[0.15, 0.05, 0.01]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function FloorMat({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.08 : WORLD.CORRIDOR_WIDTH / 2 - 0.08;

  return (
    <group position={[x, 0.005, z]}>
      {/* Mat base */}
      <mesh receiveShadow>
        <boxGeometry args={[0.8, 0.01, 0.5]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>
      {/* Texture lines */}
      {[0.15, 0.05, -0.05, -0.15].map((vy, i) => (
        <mesh key={`line-${i}`} position={[0, 0.006, vy]}>
          <boxGeometry args={[0.75, 0.002, 0.03]} />
          <meshStandardMaterial color="#4b5563" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function FloorArrow({ x, rotation }: { x: number; rotation: number }) {
  return (
    <group position={[x, 0.003, 0]} rotation={[0, rotation, 0]}>
      {/* Arrow base */}
      <mesh receiveShadow>
        <boxGeometry args={[0.4, 0.006, 0.6]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0.007, -0.2]}>
        <boxGeometry args={[0.25, 0.006, 0.25]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function CleaningSign({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.04 : WORLD.CORRIDOR_WIDTH / 2 - 0.04;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 0.15, z]} rotation={[0, rotationY, 0]}>
      {/* Sign */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.25, 0.3, 0.02]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* Warning stripe */}
      <mesh position={[0, 0.22, 0.012]}>
        <boxGeometry args={[0.2, 0.06, 0.005]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.85} />
      </mesh>
      {/* Wet floor icon */}
      <mesh position={[0, 0.12, 0.012]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.7} />
      </mesh>
      {/* Leg */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.03, 0.15, 0.03]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function EnvironmentProps() {
  const benches: { x: number; side: "left" | "right" }[] = [
    { x: 12, side: "left" },
    { x: 30, side: "right" },
    { x: 48, side: "left" },
  ];

  const waterCoolers: { x: number; side: "left" | "right" }[] = [
    { x: 6, side: "left" },
    { x: 24, side: "right" },
    { x: 42, side: "left" },
  ];

  const vendingMachines: { x: number; side: "left" | "right" }[] = [
    { x: 3, side: "right" },
    { x: 35, side: "left" },
    { x: 53, side: "right" },
  ];

  const plants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: 2, side: "left", scale: 1.0 },
    { x: 18, side: "right", scale: 0.9 },
    { x: 36, side: "left", scale: 1.1 },
    { x: 54, side: "right", scale: 0.85 },
    { x: -30, side: "right", scale: 1.2 },
    { x: 32, side: "right", scale: 0.95 },
  ];

  const vents = [5, 15, 25, 35, 45, 55];

  const acUnits: { x: number; side: "left" | "right" }[] = [
    { x: 10, side: "left" },
    { x: 28, side: "right" },
    { x: 46, side: "left" },
  ];

  const floorMats: { x: number; side: "left" | "right" }[] = [
    { x: 10, side: "left" },
    { x: 28, side: "right" },
    { x: 46, side: "left" },
  ];

  const floorArrows: { x: number; rotation: number }[] = [
    { x: 19, rotation: 0 },
    { x: 37, rotation: 0 },
    { x: 55, rotation: 0 },
  ];

  const cleaningSigns: { x: number; side: "left" | "right" }[] = [
    { x: 14, side: "right" },
    { x: 32, side: "left" },
    { x: 50, side: "right" },
  ];

  const extraLockers: { x: number; z: number; index: number }[] = [
    { x: -25, z: WORLD.CORRIDOR_WIDTH / 2 - 0.15, index: 0 },
    { x: -23, z: WORLD.CORRIDOR_WIDTH / 2 - 0.15, index: 1 },
    { x: -21, z: WORLD.CORRIDOR_WIDTH / 2 - 0.15, index: 2 },
    { x: 60, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.15, index: 3 },
    { x: 62, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.15, index: 4 },
    { x: 64, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.15, index: 5 },
  ];

  return (
    <group>
      {benches.map((b, i) => <Bench key={`bench-${i}`} x={b.x} side={b.side} />)}
      {waterCoolers.map((wc, i) => <WaterCooler key={`cooler-${i}`} x={wc.x} side={wc.side} />)}
      {vendingMachines.map((vm, i) => <VendingMachine key={`vending-${i}`} x={vm.x} side={vm.side} />)}
      {plants.map((p, i) => <PottedPlant key={`plant-${i}`} x={p.x} side={p.side} scale={p.scale} />)}
      {vents.map((v, i) => <CeilingVent key={`vent-${i}`} x={v} />)}
      {acUnits.map((ac, i) => <ACUnit key={`ac-${i}`} x={ac.x} side={ac.side} />)}
      {floorMats.map((fm, i) => <FloorMat key={`mat-${i}`} x={fm.x} side={fm.side} />)}
      {floorArrows.map((fa, i) => <FloorArrow key={`arrow-${i}`} x={fa.x} rotation={fa.rotation} />)}
      {cleaningSigns.map((cs, i) => <CleaningSign key={`clean-${i}`} x={cs.x} side={cs.side} />)}
      {extraLockers.map((el, i) => <ColoredLocker key={`locker-${i}`} x={el.x} z={el.z} index={el.index} />)}
    </group>
  );
}
