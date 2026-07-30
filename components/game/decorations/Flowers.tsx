/**
 * Decorations - Flowers
 * Phase 1 Refactor
 */
"use client";

export function Flowers({ x }: { x: number }) {
  const colors = ["#f472b6", "#facc15", "#f87171", "#c084fc", "#fb923c"];
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[x + (i - 2) * 0.25, 0.08, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={colors[i]} emissive={colors[i]} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function FlowerPatches() {
  const xs = [8, 22, 36, 50];
  return (
    <>
      {xs.map(x => <Flowers key={x} x={x} />)}
    </>
  );
}
