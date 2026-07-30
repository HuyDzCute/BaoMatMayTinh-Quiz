/**
 * Skybox & Outdoor - Outdoor Scenery
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function OutdoorScenery() {
  const cloudPositions = [
    [-15, 8, 0], [-5, 9, 2], [8, 7.5, -1], [20, 8.5, 1], [35, 8, 0], [50, 7, 2]
  ];

  return (
    <>
      {/* Sky gradient backdrop */}
      <mesh position={[20, 10, -WORLD.CORRIDOR_WIDTH / 2 - 12]}>
        <planeGeometry args={[250, 100]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>

      {/* Sun */}
      <mesh position={[45, 25, -WORLD.CORRIDOR_WIDTH / 2 - 15]}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <pointLight position={[45, 25, -WORLD.CORRIDOR_WIDTH / 2 - 15]} intensity={2} color="#fefce8" distance={100} />

      {/* Clouds */}
      {cloudPositions.map(([cx, cy, cz], i) => (
        <group key={`cloud-${i}`} position={[cx, cy, cz]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[2, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[1.5, 0.3, 0]}>
            <sphereGeometry args={[1.5, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[-1.2, 0.2, 0.5]}>
            <sphereGeometry args={[1.3, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[0.5, -0.3, 0.8]}>
            <sphereGeometry args={[1.2, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Distant trees */}
      {[10, 25, 40, 55, 65].map(x => (
        <group key={`tree-${x}`} position={[x, 0, -WORLD.CORRIDOR_WIDTH / 2 - 6]}>
          <mesh position={[0, 4, 0]}>
            <coneGeometry args={[1.8, 4, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[2, 3, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[2.2, 2.5, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 2.4, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Ground/hills */}
      <mesh position={[20, -0.5, -WORLD.CORRIDOR_WIDTH / 2 - 8]}>
        <boxGeometry args={[180, 3, 20]} />
        <meshStandardMaterial color="#86efac" roughness={0.95} />
      </mesh>

      {/* Path/sidewalk */}
      <mesh position={[20, 0.01, -WORLD.CORRIDOR_WIDTH / 2 - 4]}>
        <boxGeometry args={[100, 0.1, 3]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
      </mesh>

      {/* Ambient outdoor lighting */}
      <directionalLight position={[30, 20, -10]} intensity={0.6} color="#fffbe6" castShadow />
    </>
  );
}
