/**
 * ClassroomFurniture - Redesigned for Gameplay
 * 
 * Environment Layout Pass
 * 
 * Design Philosophy:
 * - Clear walkable paths (min 3m center corridor)
 * - Logical classroom groupings
 * - Camera-friendly placement
 * - Scale-consistent with player (1.7m)
 * 
 * Scale Reference:
 * - Player height: 1.7m
 * - Player collision radius: 0.35m
 * - Desk surface height: 0.75m
 * - Chair seat height: 0.45m
 */
"use client";

import { WORLD } from "@/lib/world-constants";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Student Desk
// ═══════════════════════════════════════════════════════════════════════════════

export function StudentDesk({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Desktop - 0.6m wide, 0.45m deep */}
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.45]} />
        <meshStandardMaterial color="#d4a574" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Left leg */}
      <mesh castShadow position={[-0.25, 0.375, 0.18]}>
        <boxGeometry args={[0.04, 0.75, 0.04]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      {/* Right leg */}
      <mesh castShadow position={[0.25, 0.375, 0.18]}>
        <boxGeometry args={[0.04, 0.75, 0.04]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      {/* Back leg (support) */}
      <mesh castShadow position={[0, 0.375, -0.18]}>
        <boxGeometry args={[0.5, 0.75, 0.03]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      {/* Storage under desk */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.35]} />
        <meshStandardMaterial color="#c4956a" roughness={0.75} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Student Chair
// ═══════════════════════════════════════════════════════════════════════════════

export function StudentChair({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Seat - 0.4m wide, 0.38m deep */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.38]} />
        <meshStandardMaterial color="#2563eb" roughness={0.8} />
      </mesh>
      {/* Backrest */}
      <mesh castShadow position={[0, 0.72, -0.17]}>
        <boxGeometry args={[0.38, 0.4, 0.03]} />
        <meshStandardMaterial color="#2563eb" roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx, 0.22, lz]}>
          <cylinderGeometry args={[0.02, 0.02, 0.44, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Teacher Desk
// ═══════════════════════════════════════════════════════════════════════════════

export function TeacherDesk({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Desktop - 1.4m wide, 0.7m deep */}
      <mesh castShadow receiveShadow position={[0, 0.78, 0]}>
        <boxGeometry args={[1.4, 0.05, 0.7]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Left pedestal */}
      <mesh castShadow position={[-0.6, 0.39, 0]}>
        <boxGeometry args={[0.35, 0.78, 0.6]} />
        <meshStandardMaterial color="#92400e" roughness={0.75} />
      </mesh>
      {/* Right pedestal */}
      <mesh castShadow position={[0.6, 0.39, 0]}>
        <boxGeometry args={[0.35, 0.78, 0.6]} />
        <meshStandardMaterial color="#92400e" roughness={0.75} />
      </mesh>
      {/* Drawer fronts */}
      <mesh position={[-0.6, 0.55, 0.31]}>
        <boxGeometry args={[0.32, 0.15, 0.02]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      <mesh position={[0.6, 0.55, 0.31]}>
        <boxGeometry args={[0.32, 0.15, 0.02]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      {/* Drawer handles */}
      <mesh position={[-0.6, 0.55, 0.33]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.6, 0.55, 0.33]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Whiteboard
// ═══════════════════════════════════════════════════════════════════════════════

export function Whiteboard({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.06 : WORLD.CORRIDOR_WIDTH / 2 - 0.06;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, 2.2, z]} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[2.0, 1.2, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Board surface */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.9, 1.1, 0.02]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      {/* Tray at bottom */}
      <mesh position={[0, -0.58, 0.03]}>
        <boxGeometry args={[1.95, 0.04, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Markers on tray */}
      {[-0.5, 0, 0.5].map((mx, i) => (
        <mesh key={i} position={[mx, -0.55, 0.06]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color={["#dc2626", "#2563eb", "#16a34a"][i]} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Projector
// ═══════════════════════════════════════════════════════════════════════════════

export function Projector({ x }: { x: number }) {
  return (
    <group position={[x, WORLD.CORRIDOR_HEIGHT - 0.15, 0]}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.12, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.7} />
      </mesh>
      {/* Vent slots */}
      {[-0.12, 0, 0.12].map((vy, i) => (
        <mesh key={i} position={[0, vy, -0.16]}>
          <boxGeometry args={[0.35, 0.02, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Bookshelf
// ═══════════════════════════════════════════════════════════════════════════════

export function Bookshelf({ x, z, side }: { x: number; z: number; side: "left" | "right" }) {
  const rotationY = side === "left" ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      {/* Main frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.35, 1.8, 1.0]} />
        <meshStandardMaterial color="#92400e" roughness={0.8} />
      </mesh>
      {/* Shelves */}
      {[0.3, 0.7, 1.1, 1.5].map((sy, i) => (
        <mesh key={i} position={[0, sy, 0]}>
          <boxGeometry args={[0.32, 0.03, 0.95]} />
          <meshStandardMaterial color="#78350f" roughness={0.75} />
        </mesh>
      ))}
      {/* Books */}
      {[
        { x: -0.1, y: 0.45, color: "#dc2626" },
        { x: 0.05, y: 0.45, color: "#2563eb" },
        { x: 0.12, y: 0.45, color: "#16a34a" },
        { x: -0.08, y: 0.85, color: "#f59e0b" },
        { x: 0.06, y: 0.85, color: "#7c3aed" },
        { x: -0.05, y: 1.25, color: "#0891b2" },
        { x: 0.08, y: 1.25, color: "#db2777" },
      ].map((book, i) => (
        <mesh key={`book-${i}`} position={[book.x, book.y, 0]} castShadow>
          <boxGeometry args={[0.06, 0.2, 0.15]} />
          <meshStandardMaterial color={book.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Trash Bin
// ═══════════════════════════════════════════════════════════════════════════════

export function TrashBin({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.12 : WORLD.CORRIDOR_WIDTH / 2 - 0.12;

  return (
    <group position={[x, 0, z]}>
      {/* Bin body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.45, 12]} />
        <meshStandardMaterial color="#374151" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Lid */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 12]} />
        <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Handle on lid */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[0.04, 0.01, 8, 16]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Environment Zones:
 * 
 * ZONE 1: HALLWAY ENTRANCE (x: -5 to 8)
 * - Clear center path for player/camera
 * - Bench along left wall
 * - Plants for decoration
 * 
 * ZONE 2: CLASSROOM A (x: 8 to 25)
 * - 3 rows of student desks (proper classroom setup)
 * - Clear center aisle for movement
 * - Teacher desk at front
 * - Bookshelf on right side
 * 
 * ZONE 3: TRANSITION (x: 25 to 30)
 * - Clear path, minimal props
 * - NPC interaction area 1 (x: 14)
 * 
 * ZONE 4: CLASSROOM B (x: 30 to 47)
 * - 3 rows of student desks
 * - Teacher desk at front
 * - NPC interaction area 2 (x: 32)
 * 
 * ZONE 5: LOCKER AREA (x: 47 to 55)
 * - Lockers along walls
 * - Clear center path
 * - NPC interaction area 3 (x: 52)
 * 
 * ZONE 6: END AREA (x: 55 to 65)
 * - Open space
 * - Decorative elements
 */

// Corridor constraints
const CORRIDOR_CENTER_MIN_Z = -1.2;  // Clear path Z minimum
const CORRIDOR_CENTER_MAX_Z = 1.2;   // Clear path Z maximum
const WALL_COLLISION_Z = 2.6;         // Wall collision boundary

// Desk cluster configuration
const DESK_CLUSTER_START_X = 10;
const DESK_CLUSTER_SPACING = 6;  // Space between desk rows
const DESK_ROWS_PER_CLUSTER = 3;
const DESK_COLS = 3;
const DESK_SPACING_X = 1.5;  // Space between desks horizontally
const DESK_SPACING_Z = 1.2;  // Space between desk rows

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: ClassroomFurniture
// ═══════════════════════════════════════════════════════════════════════════════

export function ClassroomFurniture() {
  const desks: { x: number; z: number; rotation: number }[] = [];
  const chairs: { x: number; z: number; rotation: number }[] = [];
  
  // ==========================================
  // CLASSROOM A (x: 10-25) - 2 rows of desks
  // ==========================================
  const classroomAStartX = 12;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < DESK_COLS; col++) {
      const x = classroomAStartX + col * DESK_SPACING_X;
      // Desks on the LEFT side of center path
      const z = -0.8 - row * DESK_SPACING_Z;  // Negative Z (left side)
      desks.push({ x, z, rotation: 0 });
      // Chairs in front of desks
      chairs.push({ x, z: z + 0.5, rotation: 0 });
    }
  }
  
  // ==========================================
  // CLASSROOM B (x: 32-47) - 2 rows of desks  
  // ==========================================
  const classroomBStartX = 34;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < DESK_COLS; col++) {
      const x = classroomBStartX + col * DESK_SPACING_X;
      const z = -0.8 - row * DESK_SPACING_Z;
      desks.push({ x, z, rotation: 0 });
      chairs.push({ x, z: z + 0.5, rotation: 0 });
    }
  }
  
  // ==========================================
  // TEACHER DESKS - At front of classrooms
  // ==========================================
  const teacherDesks: { x: number; z: number }[] = [
    { x: 11, z: -1.0 },   // Classroom A front
    { x: 33, z: -1.0 },   // Classroom B front
  ];
  
  // ==========================================
  // WHITEBOARDS - On left wall
  // ==========================================
  const whiteboards: { x: number; side: "left" | "right" }[] = [
    { x: 11, side: "left" },
    { x: 33, side: "left" },
  ];
  
  // ==========================================
  // PROJECTORS - Ceiling mounted
  // ==========================================
  const projectors = [11, 33];
  
  // ==========================================
  // BOOKSHELVES - Corner placement
  // ==========================================
  const bookshelves: { x: number; z: number; side: "left" | "right" }[] = [
    { x: 22, z: WALL_COLLISION_Z - 0.6, side: "right" },  // Classroom A right corner
    { x: 44, z: WALL_COLLISION_Z - 0.6, side: "right" },  // Classroom B right corner
  ];
  
  // ==========================================
  // TRASH BINS - Near doors
  // ==========================================
  const trashBins: { x: number; side: "left" | "right" }[] = [
    { x: 9, side: "left" },    // Classroom A entrance
    { x: 25, side: "right" },  // Classroom B entrance
    { x: 47, side: "left" },   // Locker area
  ];

  return (
    <group>
      {/* Student Desks */}
      {desks.map((d, i) => (
        <StudentDesk key={`desk-${i}`} x={d.x} z={d.z} rotation={d.rotation} />
      ))}
      
      {/* Student Chairs */}
      {chairs.map((c, i) => (
        <StudentChair key={`chair-${i}`} x={c.x} z={c.z} rotation={c.rotation} />
      ))}
      
      {/* Teacher Desks */}
      {teacherDesks.map((td, i) => (
        <TeacherDesk key={`tdesk-${i}`} x={td.x} z={td.z} />
      ))}
      
      {/* Whiteboards */}
      {whiteboards.map((wb, i) => (
        <Whiteboard key={`wb-${i}`} x={wb.x} side={wb.side} />
      ))}
      
      {/* Projectors */}
      {projectors.map((px, i) => (
        <Projector key={`proj-${i}`} x={px} />
      ))}
      
      {/* Bookshelves */}
      {bookshelves.map((bs, i) => (
        <Bookshelf key={`shelf-${i}`} x={bs.x} z={bs.z} side={bs.side} />
      ))}
      
      {/* Trash Bins */}
      {trashBins.map((tb, i) => (
        <TrashBin key={`trash-${i}`} x={tb.x} side={tb.side} />
      ))}
    </group>
  );
}
