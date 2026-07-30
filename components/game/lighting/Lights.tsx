/**
 * Lighting System - Main
 * Phase 1 Refactor
 */
"use client";

import { WORLD, WORLD_HALF } from "@/lib/world-constants";

export function Lights() {
  return (
    <>
      {/* Base ambient - soft warm fill */}
      <ambientLight intensity={0.35} color="#fef3c7" />

      {/* Sky/Ground hemisphere - natural outdoor light bleed */}
      <hemisphereLight args={["#e0f2fe", "#d4c4a8", 0.5]} position={[0, 20, 0]} />

      {/* Main directional - soft sunlight from windows */}
      <directionalLight position={[20, 15, -15]} intensity={0.5} color="#fffbe6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-WORLD_HALF - 10} shadow-camera-right={WORLD_HALF + 10} shadow-camera-top={20} shadow-camera-bottom={-5} shadow-bias={-0.0005} shadow-normalBias={0.02} />

      {/* Window sunlight - warm afternoon light */}
      <spotLight position={[20, 4, -WORLD.CORRIDOR_WIDTH / 2 + 0.5]} angle={Math.PI / 2.5} penumbra={0.8} intensity={1.2} color="#fef9c3" target-position={[20, 0, 0]} castShadow={false} />
      <spotLight position={[38, 4, -WORLD.CORRIDOR_WIDTH / 2 + 0.5]} angle={Math.PI / 2.5} penumbra={0.8} intensity={1.0} color="#fef9c3" target-position={[38, 0, 0]} castShadow={false} />
      <spotLight position={[56, 4, -WORLD.CORRIDOR_WIDTH / 2 + 0.5]} angle={Math.PI / 2.5} penumbra={0.8} intensity={0.9} color="#fef9c3" target-position={[56, 0, 0]} castShadow={false} />

      {/* Fluorescent corridor lights - cool daylight tubes */}
      {[0, 10, 20, 30, 40, 50, 60].map(x => (
        <pointLight key={`fl-${x}`} position={[x - WORLD_HALF + 5, WORLD.CORRIDOR_HEIGHT - 0.3, 0]} intensity={0.6} color="#f0fdf4" distance={8} decay={2} />
      ))}

      {/* Classroom area warm spots */}
      <pointLight position={[15, 3, -WORLD.CORRIDOR_WIDTH / 4]} intensity={0.4} color="#fef3c7" distance={6} decay={2} />
      <pointLight position={[33, 3, -WORLD.CORRIDOR_WIDTH / 4]} intensity={0.4} color="#fef3c7" distance={6} decay={2} />
      <pointLight position={[51, 3, -WORLD.CORRIDOR_WIDTH / 4]} intensity={0.4} color="#fef3c7" distance={6} decay={2} />

      {/* Locker area accent - slightly cooler */}
      <pointLight position={[20, 2, 0]} intensity={0.25} color="#f0f9ff" distance={12} decay={2} />

      {/* Near-exit glow - emergency feel */}
      <pointLight position={[-32, 3, 0]} intensity={0.15} color="#bbf7d0" distance={5} decay={2} />
      <pointLight position={[32, 3, 0]} intensity={0.15} color="#bbf7d0" distance={5} decay={2} />
    </>
  );
}
