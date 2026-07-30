/**
 * Skybox & Outdoor - Skybox
 * Phase 1 Refactor
 */
"use client";

import * as THREE from "three";

export function SkyDome() {
  return (
    <mesh scale={[200, 200, 200]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#87ceeb" side={THREE.BackSide} />
    </mesh>
  );
}

export function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Main cloud puff */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Left puff */}
      <mesh position={[-1.2, -0.3, 0.5]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Right puff */}
      <mesh position={[1.3, -0.2, -0.3]}>
        <sphereGeometry args={[1.1, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Top puff */}
      <mesh position={[0.2, 0.8, 0]}>
        <sphereGeometry args={[0.9, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Sun() {
  return (
    <group position={[80, 60, -100]}>
      {/* Sun core */}
      <mesh>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Sun glow */}
      <mesh scale={[1.3, 1.3, 1.3]}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#fef9c3" transparent opacity={0.4} />
      </mesh>
      {/* Light emission */}
      <pointLight intensity={0.8} color="#fef9c3" distance={500} />
    </group>
  );
}

export function DistantBuilding({ x, y, z, width, height, depth }: {
  x: number; y: number; z: number; width: number; height: number; depth: number;
}) {
  return (
    <group position={[x, y, z]}>
      {/* Main building */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      {/* Windows grid */}
      {[...Array(4)].map((_, floor) => (
        <group key={`floor-${floor}`} position={[0, -height / 2 + 2 + floor * 3, depth / 2 + 0.1]}>
          {[-width / 2 + 2, 0, width / 2 - 2].map((wx, i) => (
            <mesh key={`win-${i}`} position={[wx, 0, 0]}>
              <boxGeometry args={[1.5, 2, 0.1]} />
              <meshBasicMaterial color="#fef3c7" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function DistantTree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Trunk */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 8, 8]} />
        <meshBasicMaterial color="#78350f" />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 10, 0]}>
        <sphereGeometry args={[4, 12, 12]} />
        <meshBasicMaterial color="#15803d" />
      </mesh>
      <mesh position={[-2, 8, 1]}>
        <sphereGeometry args={[2.5, 10, 10]} />
        <meshBasicMaterial color="#166534" />
      </mesh>
      <mesh position={[2, 9, -1]}>
        <sphereGeometry args={[2.8, 10, 10]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

export function DistantHill({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <mesh position={[x, -2, z]} scale={[scale, scale * 0.4, scale]}>
      <sphereGeometry args={[20, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color="#86efac" side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Skybox() {
  const clouds: { position: [number, number, number]; scale: number }[] = [
    { position: [-50, 45, -80], scale: 1.5 },
    { position: [0, 50, -100], scale: 2 },
    { position: [60, 42, -70], scale: 1.2 },
    { position: [-20, 55, -120], scale: 1.8 },
    { position: [100, 48, -90], scale: 1.6 },
  ];

  const buildings = [
    { x: -100, y: 15, z: -80, width: 25, height: 40, depth: 15 },
    { x: -60, y: 10, z: -90, width: 18, height: 30, depth: 12 },
    { x: 30, y: 20, z: -85, width: 30, height: 50, depth: 18 },
    { x: 90, y: 12, z: -75, width: 22, height: 35, depth: 14 },
    { x: 140, y: 18, z: -95, width: 28, height: 45, depth: 16 },
  ];

  const trees = [
    { x: -80, z: -70 },
    { x: -40, z: -85 },
    { x: 20, z: -80 },
    { x: 70, z: -75 },
    { x: 120, z: -88 },
    { x: 160, z: -72 },
  ];

  return (
    <group>
      <SkyDome />
      <Sun />
      {clouds.map((c, i) => <Cloud key={`cloud-${i}`} position={c.position} scale={c.scale} />)}
      {buildings.map((b, i) => <DistantBuilding key={`building-${i}`} x={b.x} y={b.y} z={b.z} width={b.width} height={b.height} depth={b.depth} />)}
      {trees.map((t, i) => <DistantTree key={`tree-${i}`} x={t.x} z={t.z} />)}
      <DistantHill x={-50} z={-60} scale={1.2} />
      <DistantHill x={80} z={-65} scale={1.5} />
    </group>
  );
}
