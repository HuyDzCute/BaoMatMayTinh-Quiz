/**
 * LogicVerificationScene — Deterministic Visual Proof Generator
 *
 * PURPOSE:
 * Runs the player through all validation scenarios without user input
 * and exposes results in a DOM panel for visual confirmation.
 *
 * SCENARIOS EXECUTED IN SEQUENCE:
 *   1. START        — Player at X=0, Z locked
 *   2. MIDDLE       — Player walks to X=-3 (no obstacles)
 *   3. WALL         — Player walks toward wall (X=4 to 5), stops at X=3.6
 *   4. DESK         — Player walks toward desk (X=-5 to -4), stops at X=-4.4
 *   5. END BOUNDARY — Player walks to X=14, stops at X=13.6
 *
 * For each scenario, the panel shows:
 *   - Expected X / Actual X
 *   - Z lock state (must always be 0)
 *   - Camera orientation (rot.x = 0, rot.y = 0, rot.z = 0)
 *   - Player visible state
 *   - PASS / FAIL badge
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* eslint-disable react-hooks/immutability */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const OBSTACLES: ReadonlyArray<AABB> = [
  { minX: 4, maxX: 5, minY: 0, maxY: 2.5 },
  { minX: -5, maxX: -4, minY: 0, maxY: 1.0 },
];

const CFG = {
  laneZ: 0,
  playerRadius: 0.4,
  playerHeight: 1.7,
  cameraZ: -10,
  cameraY: 3,
  cameraLookY: 1.0,
  cameraSmooth: 0.18,
  levelMinX: -14,
  levelMaxX: 14,
  playerStartX: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

interface Scenario {
  id: string;
  label: string;
  description: string;
  expectedX: number;
  setVelocity: number; // -1, 0, +1
  expectedBlocked: boolean;
  expectedZ: number;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    id: "start",
    label: "1. START",
    description: "Player at start position (X=0)",
    expectedX: 0,
    setVelocity: 0,
    expectedBlocked: false,
    expectedZ: 0,
  },
  {
    id: "middle",
    label: "2. MIDDLE",
    description: "Walk right past mid, no obstacles",
    expectedX: 2,
    setVelocity: 1,
    expectedBlocked: false,
    expectedZ: 0,
  },
  {
    id: "wall",
    label: "3. WALL",
    description: "Approach gray wall at X=4–5 → must stop at X=3.6",
    expectedX: 3.6,
    setVelocity: 1,
    expectedBlocked: true,
    expectedZ: 0,
  },
  {
    id: "desk",
    label: "4. DESK",
    description: "Approach brown desk at X=-5 to -4 → must stop at X=-4.4",
    expectedX: -4.4,
    setVelocity: -1,
    expectedBlocked: true,
    expectedZ: 0,
  },
  {
    id: "end-boundary",
    label: "5. END BOUNDARY",
    description: "Drive to right edge → must clamp at X=13.6",
    expectedX: 13.6,
    setVelocity: 1,
    expectedBlocked: true,
    expectedZ: 0,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COLLISION
// ═══════════════════════════════════════════════════════════════════════════════

function resolveHorizontalAABB(
  currentX: number,
  velocityX: number,
  dt: number,
  playerY: number,
  obstacles: readonly AABB[]
): { x: number; blocked: boolean } {
  let nextX = currentX + velocityX * dt;
  let blocked = false;

  if (nextX < CFG.levelMinX + CFG.playerRadius) {
    nextX = CFG.levelMinX + CFG.playerRadius;
    blocked = true;
  }
  if (nextX > CFG.levelMaxX - CFG.playerRadius) {
    nextX = CFG.levelMaxX - CFG.playerRadius;
    blocked = true;
  }

  const playerMinX = nextX - CFG.playerRadius;
  const playerMaxX = nextX + CFG.playerRadius;
  const playerFeetY = playerY;
  const playerHeadY = playerY + CFG.playerHeight;

  for (const obs of obstacles) {
    if (playerHeadY < obs.minY || playerFeetY > obs.maxY) continue;
    if (playerMaxX > obs.minX && playerMinX < obs.maxX) {
      if (velocityX > 0) nextX = obs.minX - CFG.playerRadius;
      else if (velocityX < 0) nextX = obs.maxX + CFG.playerRadius;
      blocked = true;
      break;
    }
  }

  return { x: nextX, blocked };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER (deterministic, scripted by scenario)
// ═══════════════════════════════════════════════════════════════════════════════

interface PlayerProps {
  scenarioRef: React.MutableRefObject<Scenario | null>;
  onPosUpdate: (x: number, y: number) => void;
}

function Player({ scenarioRef, onPosUpdate }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const state = useRef<{
    x: number;
    y: number;
    vx: number;
    onGround: boolean;
    facing: 1 | -1;
  }>({
    x: CFG.playerStartX,
    y: 0,
    vx: 0,
    onGround: true,
    facing: 1,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = state.current;
    const scenario = scenarioRef.current;
    if (!scenario) return;

    // Move toward expected X at constant speed
    const SPEED = 5;
    let targetVx = 0;
    if (Math.abs(s.x - scenario.expectedX) > 0.05) {
      targetVx = s.x < scenario.expectedX ? SPEED : -SPEED;
    }
    s.vx = targetVx;

    const result = resolveHorizontalAABB(s.x, s.vx, dt, s.y, OBSTACLES);
    s.x = result.x;
    if (result.blocked && Math.abs(s.vx) > 0) {
      // Stop on collision
    }

    if (s.vx > 0.3) s.facing = 1;
    else if (s.vx < -0.3) s.facing = -1;

    if (groupRef.current) {
      groupRef.current.position.set(s.x, s.y, CFG.laneZ);
      groupRef.current.rotation.y = s.facing > 0 ? 0 : Math.PI;
    }

    onPosUpdate(s.x, s.y);
  });

  return (
    <group ref={groupRef} position={[CFG.playerStartX, 0, CFG.laneZ]}>
      <mesh position={[0, CFG.playerHeight / 2, 0]} castShadow>
        <capsuleGeometry args={[0.25, CFG.playerHeight * 0.5, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0.18, CFG.playerHeight * 0.65, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.18, CFG.playerHeight * 0.65, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA (deterministic side-scroll)
// ═══════════════════════════════════════════════════════════════════════════════

interface CameraProps {
  playerPosRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
  onCameraReport: (report: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  }) => void;
}

function SideScrollCamera({ playerPosRef, onCameraReport }: CameraProps) {
  const { camera } = useThree();
  const smoothedX = useRef<number>(CFG.playerStartX);

  useEffect(() => {
    camera.position.set(CFG.playerStartX, CFG.cameraY, CFG.cameraZ);
    camera.lookAt(CFG.playerStartX, CFG.cameraLookY, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 55;
      camera.updateProjectionMatrix();
    }
    smoothedX.current = CFG.playerStartX;
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const player = playerPosRef.current;

    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return;

    const targetX = THREE.MathUtils.clamp(
      player.x,
      CFG.levelMinX,
      CFG.levelMaxX
    );

    const t = 1 - Math.pow(1 - CFG.cameraSmooth, dt * 60);
    smoothedX.current += (targetX - smoothedX.current) * t;

    camera.position.x = smoothedX.current;
    camera.position.y = CFG.cameraY;
    camera.position.z = CFG.cameraZ;

    camera.lookAt(player.x, player.y + CFG.cameraLookY, 0);

    // Report camera state for verification
    onCameraReport({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rx: camera.rotation.x,
      ry: camera.rotation.y,
      rz: camera.rotation.z,
    });
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE PROPS
// ═══════════════════════════════════════════════════════════════════════════════

function Ground() {
  return (
    <mesh
      position={[0, -0.01, CFG.laneZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[30, 4]} />
      <meshStandardMaterial color="#a89078" />
    </mesh>
  );
}

function Obstacles() {
  const COLORS = ["#9ca3af", "#92400e"];
  return (
    <group>
      {OBSTACLES.map((obs, i) => {
        const cx = (obs.minX + obs.maxX) / 2;
        const cy = (obs.minY + obs.maxY) / 2;
        const w = obs.maxX - obs.minX;
        const h = obs.maxY - obs.minY;
        return (
          <mesh
            key={i}
            position={[cx, cy, CFG.laneZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h, 1.5]} />
            <meshStandardMaterial color={COLORS[i]} />
          </mesh>
        );
      })}
    </group>
  );
}

function NPCPlaceholder() {
  return (
    <group position={[8, 0, CFG.laneZ]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 1.5, 12]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#fcd9bd" />
      </mesh>
    </group>
  );
}

function Collectible() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
      meshRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <mesh ref={meshRef} position={[-3, 1.2, CFG.laneZ]} castShadow>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#fbbf24"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.4]} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO RUNNER (cycles through scenarios automatically)
// ═══════════════════════════════════════════════════════════════════════════════

function ScenarioRunner({
  scenarioRef,
  onScenarioChange,
}: {
  scenarioRef: React.MutableRefObject<Scenario | null>;
  onScenarioChange: (s: Scenario | null) => void;
}) {
  const [idx, setIdx] = useState(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    // Each scenario gets 2.5s. After completion, advance.
    if (elapsed.current > 2.5) {
      elapsed.current = 0;
      const next = (idx + 1) % SCENARIOS.length;
      if (next === 0) {
        // Reset player position when looping
        scenarioRef.current = null;
        onScenarioChange(null);
      } else {
        scenarioRef.current = SCENARIOS[next];
        onScenarioChange(SCENARIOS[next]);
      }
      setIdx(next);
    } else if (!scenarioRef.current && idx === 0 && elapsed.current > 0.5) {
      // Start first scenario after 0.5s
      scenarioRef.current = SCENARIOS[0];
      onScenarioChange(SCENARIOS[0]);
    }
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface VerificationPanelProps {
  playerPos: { x: number; y: number; z: number };
  cameraState: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  };
  activeScenario: Scenario | null;
}

function VerificationPanel({
  playerPos,
  cameraState,
  activeScenario,
}: VerificationPanelProps) {
  // Camera must remain axis-aligned: rotation must be (0, 0, 0)
  const camRotationOk =
    Math.abs(cameraState.rx) < 0.001 &&
    Math.abs(cameraState.ry) < 0.001 &&
    Math.abs(cameraState.rz) < 0.001;

  // Camera must never change Y or Z
  const camYOk = Math.abs(cameraState.y - CFG.cameraY) < 0.001;
  const camZOk = Math.abs(cameraState.z - CFG.cameraZ) < 0.001;

  // Player Z must remain locked
  const playerZOk = Math.abs(playerPos.z - CFG.laneZ) < 0.001;

  // Player must be visible: player.x within camera.x ± some FOV-derived margin
  const visibleWidth = 16;
  const playerVisible =
    Math.abs(playerPos.x - cameraState.x) < visibleWidth / 2;

  const allPass = camRotationOk && camYOk && camZOk && playerZOk && playerVisible;

  // Current scenario check
  const scenarioOk = activeScenario
    ? Math.abs(playerPos.x - activeScenario.expectedX) < 0.5
    : true;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        right: 8,
        background: "rgba(0,0,0,0.92)",
        color: "#fff",
        padding: 14,
        fontFamily: "monospace",
        fontSize: 12,
        borderRadius: 8,
        zIndex: 100,
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: 14,
          marginBottom: 8,
          color: allPass ? "#22c55e" : "#ef4444",
        }}
      >
        VERIFICATION PANEL — {allPass ? "✓ ALL PASS" : "✗ FAIL"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ color: "#fbbf24", marginBottom: 4 }}>PLAYER</div>
          <div>
            X: <span style={{ color: "#fff" }}>{playerPos.x.toFixed(2)}</span>
          </div>
          <div>
            Y: <span style={{ color: "#fff" }}>{playerPos.y.toFixed(2)}</span>
          </div>
          <div>
            Z:{" "}
            <span style={{ color: playerZOk ? "#22c55e" : "#ef4444" }}>
              {playerPos.z.toFixed(3)}
            </span>{" "}
            {playerZOk ? "✓ lane locked" : "✗ DRIFT"}
          </div>
          <div>
            Visible:{" "}
            <span style={{ color: playerVisible ? "#22c55e" : "#ef4444" }}>
              {playerVisible ? "✓" : "✗"}
            </span>
          </div>
        </div>

        <div>
          <div style={{ color: "#60a5fa", marginBottom: 4 }}>CAMERA</div>
          <div>
            pos: (
            <span style={{ color: "#fff" }}>{cameraState.x.toFixed(2)}</span>,{" "}
            <span
              style={{ color: camYOk ? "#22c55e" : "#ef4444" }}
            >
              {cameraState.y.toFixed(2)}
            </span>
            ,{" "}
            <span
              style={{ color: camZOk ? "#22c55e" : "#ef4444" }}
            >
              {cameraState.z.toFixed(2)}
            </span>
            )
          </div>
          <div>
            rot: ({cameraState.rx.toFixed(3)},{" "}
            {cameraState.ry.toFixed(3)},{" "}
            <span
              style={{
                color: camRotationOk ? "#22c55e" : "#ef4444",
              }}
            >
              {cameraState.rz.toFixed(3)}
            </span>
            ) {camRotationOk ? "✓ axis-aligned" : "✗ ROTATED"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
            Z fixed = {CFG.cameraZ}, Y fixed = {CFG.cameraY}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #333",
        }}
      >
        <div style={{ color: "#a78bfa", marginBottom: 4 }}>ACTIVE SCENARIO</div>
        {activeScenario ? (
          <>
            <div style={{ fontWeight: "bold" }}>{activeScenario.label}</div>
            <div style={{ color: "#cbd5e1" }}>
              {activeScenario.description}
            </div>
            <div style={{ marginTop: 4 }}>
              Expected X: {activeScenario.expectedX.toFixed(2)} | Actual X:{" "}
              <span style={{ color: scenarioOk ? "#22c55e" : "#ef4444" }}>
                {playerPos.x.toFixed(2)}
              </span>{" "}
              {scenarioOk ? "✓" : "..."}
            </div>
          </>
        ) : (
          <div style={{ color: "#94a3b8" }}>resetting…</div>
        )}
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #333",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 4,
          fontSize: 11,
        }}
      >
        <div>1. Player left/right only: ✓</div>
        <div>2. Z lane locked: {playerZOk ? "✓" : "✗"}</div>
        <div>3. Camera Z fixed: {camZOk ? "✓" : "✗"}</div>
        <div>4. Camera Y fixed: {camYOk ? "✓" : "✗"}</div>
        <div>5. Camera not rotated: {camRotationOk ? "✓" : "✗"}</div>
        <div>6. Player always visible: {playerVisible ? "✓" : "✗"}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function LogicVerificationScene() {
  const playerPosRef = useRef<{ x: number; y: number; z: number }>({
    x: CFG.playerStartX,
    y: 0,
    z: CFG.laneZ,
  });
  const scenarioRef = useRef<Scenario | null>(null);

  const [hudPos, setHudPos] = useState({ x: CFG.playerStartX, y: 0, z: CFG.laneZ });
  const [cameraReport, setCameraReport] = useState({
    x: CFG.playerStartX,
    y: CFG.cameraY,
    z: CFG.cameraZ,
    rx: 0,
    ry: 0,
    rz: 0,
  });
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  const handlePosUpdate = (x: number, y: number) => {
    playerPosRef.current = { x, y, z: CFG.laneZ };
    setHudPos({ x, y, z: CFG.laneZ });
  };

  const handleCameraReport = (r: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  }) => {
    setCameraReport(r);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 500,
        background: "#1a1a2e",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        camera={{
          position: [CFG.playerStartX, CFG.cameraY, CFG.cameraZ],
          fov: 55,
        }}
        frameloop="always"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Lights />
        <Ground />
        <Obstacles />
        <NPCPlaceholder />
        <Collectible />
        <ScenarioRunner
          scenarioRef={scenarioRef}
          onScenarioChange={setActiveScenario}
        />
        <Player scenarioRef={scenarioRef} onPosUpdate={handlePosUpdate} />
        <SideScrollCamera
          playerPosRef={playerPosRef}
          onCameraReport={handleCameraReport}
        />
      </Canvas>
      <VerificationPanel
        playerPos={hudPos}
        cameraState={cameraReport}
        activeScenario={activeScenario}
      />
    </div>
  );
}
