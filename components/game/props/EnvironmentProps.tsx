/**
 * Environment Props - Redesigned for Gameplay
 * 
 * Environment Layout Pass
 * 
 * Design Philosophy:
 * - Clear functional zones
 * - Camera-friendly placement
 * - Props support gameplay, not obstruct it
 * - Scale-consistent placement
 */
"use client";

import { WORLD } from "@/lib/world-constants";
import { ColoredLocker } from "../environment/Lockers";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CORRIDOR_WIDTH = WORLD.CORRIDOR_WIDTH;
const WALL_Z_LEFT = -CORRIDOR_WIDTH / 2;
const WALL_Z_RIGHT = CORRIDOR_WIDTH / 2;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function Bench({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? WALL_Z_LEFT + 0.6 : WALL_Z_RIGHT - 0.6;

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
  const z = side === "left" ? WALL_Z_LEFT + 0.15 : WALL_Z_RIGHT - 0.15;

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
  const z = side === "left" ? WALL_Z_LEFT + 0.25 : WALL_Z_RIGHT - 0.25;
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
  const z = side === "left" ? WALL_Z_LEFT + 0.2 : WALL_Z_RIGHT - 0.2;

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
  const z = side === "left" ? WALL_Z_LEFT + 0.15 : WALL_Z_RIGHT - 0.15;
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
  const z = side === "left" ? WALL_Z_LEFT + 0.08 : WALL_Z_RIGHT - 0.08;

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
  const z = side === "left" ? WALL_Z_LEFT + 0.04 : WALL_Z_RIGHT - 0.04;
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: EnvironmentProps
// ═══════════════════════════════════════════════════════════════════════════════

export function EnvironmentProps() {
  // ==========================================
  // ZONE 1: ENTRANCE HALLWAY (x: -5 to 8)
  // Clear path, welcoming area
  // ==========================================
  const entranceBenches: { x: number; side: "left" | "right" }[] = [
    { x: 2, side: "left" },
    { x: 5, side: "right" },
  ];
  
  const entrancePlants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: -2, side: "right", scale: 1.0 },
    { x: 3, side: "left", scale: 0.9 },
  ];
  
  // ==========================================
  // ZONE 2: CLASSROOM A (x: 8 to 25)
  // Academic area - minimal props
  // ==========================================
  const classroomAPlants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: 20, side: "right", scale: 0.85 },
  ];
  
  // ==========================================
  // ZONE 3: TRANSITION (x: 25 to 30)
  // Clear movement path
  // ==========================================
  
  // ==========================================
  // ZONE 4: CLASSROOM B (x: 30 to 47)
  // Academic area
  // ==========================================
  const classroomBPlants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: 40, side: "left", scale: 0.9 },
  ];
  
  // ==========================================
  // ZONE 5: LOCKER AREA (x: 47 to 55)
  // Organized storage
  // ==========================================
  const lockerAreaPlants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: 50, side: "right", scale: 1.0 },
    { x: 54, side: "left", scale: 0.85 },
  ];
  
  // ==========================================
  // ZONE 6: END AREA (x: 55 to 65)
  // Decorative terminus
  // ==========================================
  const endAreaPlants: { x: number; side: "left" | "right"; scale: number }[] = [
    { x: 58, side: "right", scale: 1.1 },
    { x: 62, side: "left", scale: 0.9 },
  ];
  
  // ==========================================
  // UTILITY: Vending Machines
  // Placed at zone transitions
  // ==========================================
  const vendingMachines: { x: number; side: "left" | "right" }[] = [
    { x: 8, side: "right" },
    { x: 30, side: "left" },
    { x: 55, side: "right" },
  ];
  
  // ==========================================
  // UTILITY: Water Coolers
  // Near classrooms
  // ==========================================
  const waterCoolers: { x: number; side: "left" | "right" }[] = [
    { x: 12, side: "left" },
    { x: 35, side: "right" },
  ];
  
  // ==========================================
  // UTILITY: Ceiling Vents
  // Evenly spaced throughout
  // ==========================================
  const vents = [5, 15, 25, 35, 45, 55];
  
  // ==========================================
  // UTILITY: AC Units
  // Near zones that need climate control
  // ==========================================
  const acUnits: { x: number; side: "left" | "right" }[] = [
    { x: 15, side: "left" },
    { x: 38, side: "right" },
  ];
  
  // ==========================================
  // UTILITY: Floor Mats
  // At zone entrances
  // ==========================================
  const floorMats: { x: number; side: "left" | "right" }[] = [
    { x: 8, side: "left" },
    { x: 25, side: "right" },
    { x: 47, side: "left" },
  ];
  
  // ==========================================
  // UTILITY: Direction Arrows
  // Guide player toward objectives
  // ==========================================
  const floorArrows: { x: number; rotation: number }[] = [
    { x: 18, rotation: 0 },
    { x: 40, rotation: 0 },
  ];
  
  // ==========================================
  // LOCKERS: Along walls
  // ==========================================
  const wallLockers: { x: number; z: number; index: number }[] = [
    // Left wall lockers (negative Z)
    { x: 48, z: WALL_Z_LEFT + 0.25, index: 0 },
    { x: 49, z: WALL_Z_LEFT + 0.25, index: 1 },
    { x: 50, z: WALL_Z_LEFT + 0.25, index: 2 },
    { x: 51, z: WALL_Z_LEFT + 0.25, index: 3 },
    { x: 52, z: WALL_Z_LEFT + 0.25, index: 4 },
    // Right wall lockers (positive Z)
    { x: 53, z: WALL_Z_RIGHT - 0.25, index: 5 },
    { x: 54, z: WALL_Z_RIGHT - 0.25, index: 6 },
  ];

  return (
    <group>
      {/* Benches - Rest areas */}
      {entranceBenches.map((b, i) => (
        <Bench key={`bench-${i}`} x={b.x} side={b.side} />
      ))}
      
      {/* Water Coolers */}
      {waterCoolers.map((wc, i) => (
        <WaterCooler key={`cooler-${i}`} x={wc.x} side={wc.side} />
      ))}
      
      {/* Vending Machines */}
      {vendingMachines.map((vm, i) => (
        <VendingMachine key={`vending-${i}`} x={vm.x} side={vm.side} />
      ))}
      
      {/* Plants - Scattered throughout */}
      {[...entrancePlants, ...classroomAPlants, ...classroomBPlants, ...lockerAreaPlants, ...endAreaPlants].map((p, i) => (
        <PottedPlant key={`plant-${i}`} x={p.x} side={p.side} scale={p.scale} />
      ))}
      
      {/* Ceiling Vents */}
      {vents.map((v, i) => (
        <CeilingVent key={`vent-${i}`} x={v} />
      ))}
      
      {/* AC Units */}
      {acUnits.map((ac, i) => (
        <ACUnit key={`ac-${i}`} x={ac.x} side={ac.side} />
      ))}
      
      {/* Floor Mats */}
      {floorMats.map((fm, i) => (
        <FloorMat key={`mat-${i}`} x={fm.x} side={fm.side} />
      ))}
      
      {/* Floor Arrows */}
      {floorArrows.map((fa, i) => (
        <FloorArrow key={`arrow-${i}`} x={fa.x} rotation={fa.rotation} />
      ))}
      
      {/* Lockers - Aligned along walls */}
      {wallLockers.map((el, i) => (
        <ColoredLocker key={`locker-${i}`} x={el.x} z={el.z} index={el.index} />
      ))}
    </group>
  );
}
