/**
 * MinimalSideScrollTest — Canonical Interactive Validation Scene
 *
 * PURPOSE:
 *   Validate the refactored 2.5D architecture (camera, player, collision,
 *   NPC interaction, collectibles, quiz trigger) using production-ready
 *   modules, BEFORE integrating into the production map.
 *
 *   This is the canonical version. It REUSES production-ready modules
 *   instead of duplicating logic:
 *
 *     - SideScrollPlayerStateMachine → player physics (X-only, pure)
 *     - <CameraController>           → side-scroll camera (production component)
 *     - TEST_CAMERA_BOUNDS           → narrow level bounds for tests
 *     - BoxObstacle                  → shared collision types
 *     - MockNPC / MockCollectible    → test-only triggers (no production)
 *     - MockQuizTrigger              → emits a mock quiz event (no Firebase)
 *
 * DEV-ONLY. Must never touch:
 *   - production save slots
 *   - cloud sync
 *   - Firebase writes
 *   - leaderboard
 *   - production gameplay map (WordRunGame.tsx, WorldScene.tsx, etc.)
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SideScrollPlayerStateMachine } from "@/lib/game/player/controller/player-state-machine.sideScroll";
import type { BoxObstacle } from "@/lib/game/collision/BoxObstacle";
import { CameraController } from "@/components/game/CameraController";
import { TEST_CAMERA_BOUNDS } from "@/components/game/camera/CameraBounds";
import { MockCollectible } from "./mocks/MockCollectible";
import { MockNPC } from "./mocks/MockNPC";
import { MockQuizTrigger } from "./mocks/MockQuizTrigger";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — narrow sandbox level.
// ─────────────────────────────────────────────────────────────────────────────

const LANE_Z = 0;

const OBSTACLES: ReadonlyArray<BoxObstacle> = [
  { id: "wall", minX: 4, maxX: 5, minY: 0, maxY: 2.5 },
  { id: "desk", minX: -5, maxX: -4, minY: 0, maxY: 1.0 },
];

// Collectibles (X positions along the lane)
const COLLECTIBLE_POSITIONS: ReadonlyArray<{ x: number; id: string }> = [
  { x: -3, id: "c-1" },
];

// NPC placements (X positions along the lane)
const MOCK_NPC_POSITIONS: ReadonlyArray<{ x: number; id: string }> = [
  { x: 8, id: "n-1" },
];

// Quiz trigger placements (X positions)
const QUIZ_TRIGGER_POSITIONS: ReadonlyArray<{ x: number; id: string }> = [
  { x: 10, id: "q-1" },
];

// ─────────────────────────────────────────────────────────────────────────────
// INPUT — same shape as production input ref.
// ─────────────────────────────────────────────────────────────────────────────

interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

function useKeyboardInput(): React.MutableRefObject<InputState> {
  const input = useRef<InputState>({ left: false, right: false, jump: false });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") input.current.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") input.current.right = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
        input.current.jump = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") input.current.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") input.current.right = false;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
        input.current.jump = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return input;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE PROPS
// ─────────────────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <mesh
      position={[0, -0.01, LANE_Z]}
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
            key={obs.id}
            position={[cx, cy, LANE_Z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, h, 1.5]} />
            <meshStandardMaterial color={COLORS[i % COLORS.length]} />
          </mesh>
        );
      })}
    </group>
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

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER (uses SideScrollPlayerStateMachine)
// ─────────────────────────────────────────────────────────────────────────────

interface TestPlayerProps {
  inputRef: React.MutableRefObject<InputState>;
  onPosUpdate: (x: number, y: number, z: number) => void;
  onCollectiblePickup: (id: string) => void;
  onNpcInteract: (id: string) => void;
  onQuizTriggered: (id: string) => void;
  collectedIds: Set<string>;
  interactedNpcIds: Set<string>;
  quizTriggeredIds: Set<string>;
}

function TestPlayer({
  inputRef,
  onPosUpdate,
  onCollectiblePickup,
  onNpcInteract,
  onQuizTriggered,
  collectedIds,
  interactedNpcIds,
  quizTriggeredIds,
}: TestPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sm = useMemo(() => new SideScrollPlayerStateMachine({ startX: 0, laneZ: LANE_Z }), []);
  const lastJumpRef = useRef(false);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const input = inputRef.current;

    // Edge-trigger jump
    const jumpEdge = input.jump && !lastJumpRef.current;
    lastJumpRef.current = input.jump;

    sm.update(
      dt,
      {
        moveX: input.left ? -1 : input.right ? 1 : 0,
        jump: jumpEdge,
      },
      OBSTACLES
    );

    const pos = sm.position;
    if (groupRef.current) {
      groupRef.current.position.set(pos.x, pos.y, pos.z);
      groupRef.current.rotation.y = sm.state.facing > 0 ? 0 : Math.PI;
    }

    onPosUpdate(pos.x, pos.y, pos.z);

    // ── Trigger checks (each fires ONCE per scene) ──────────────────────────
    for (const c of COLLECTIBLE_POSITIONS) {
      if (collectedIds.has(c.id)) continue;
      if (Math.abs(pos.x - c.x) < 1.0) {
        onCollectiblePickup(c.id);
      }
    }

    for (const n of MOCK_NPC_POSITIONS) {
      if (interactedNpcIds.has(n.id)) continue;
      if (Math.abs(pos.x - n.x) < 2.0) {
        onNpcInteract(n.id);
      }
    }

    for (const q of QUIZ_TRIGGER_POSITIONS) {
      if (quizTriggeredIds.has(q.id)) continue;
      if (Math.abs(pos.x - q.x) < 1.5) {
        onQuizTriggered(q.id);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, LANE_Z]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.85, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0.18, 1.1, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.18, 1.1, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG HUD
// ─────────────────────────────────────────────────────────────────────────────

interface DebugHudProps {
  x: number;
  y: number;
  z: number;
  collected: string[];
  npcInteracted: string[];
  quizTriggered: string[];
}

function DebugHud({ x, y, z, collected, npcInteracted, quizTriggered }: DebugHudProps) {
  const zIsLocked = Math.abs(z - LANE_Z) < 0.001;
  const xIsBounded =
    x >= TEST_CAMERA_BOUNDS.minX - 0.4 - 0.01 &&
    x <= TEST_CAMERA_BOUNDS.maxX + 0.4 + 0.01;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        padding: "10px 14px",
        fontFamily: "monospace",
        fontSize: 12,
        borderRadius: 6,
        pointerEvents: "none",
        zIndex: 100,
        minWidth: 260,
      }}
    >
      <div style={{ fontWeight: "bold", color: "#fff", marginBottom: 6 }}>
        2.5D TEST SCENE — V2
      </div>
      <div>Player X: <span style={{ color: "#fff" }}>{x.toFixed(2)}</span></div>
      <div>Player Y: <span style={{ color: "#fff" }}>{y.toFixed(2)}</span></div>
      <div>
        Player Z:{" "}
        <span style={{ color: zIsLocked ? "#0f0" : "#f44" }}>
          {z.toFixed(3)}
        </span>{" "}
        {zIsLocked ? "✓ locked" : "✗ DRIFT"}
      </div>
      <div>
        Bounds:{" "}
        <span style={{ color: xIsBounded ? "#0f0" : "#f44" }}>
          {xIsBounded ? "✓ ok" : "✗ out"}
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid #444",
          color: "#aaa",
          fontSize: 11,
        }}
      >
        Collected: {collected.length === 0 ? "—" : collected.join(", ")}
      </div>
      <div style={{ color: "#aaa", fontSize: 11 }}>
        NPC hit: {npcInteracted.length === 0 ? "—" : npcInteracted.join(", ")}
      </div>
      <div style={{ color: "#aaa", fontSize: 11 }}>
        Quiz fired: {quizTriggered.length === 0 ? "—" : quizTriggered.join(", ")}
      </div>
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid #444",
          color: "#aaa",
          fontSize: 11,
        }}
      >
        ←/A · →/D · Space (jump)
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function MinimalSideScrollTestV2() {
  const inputRef = useKeyboardInput();
  const playerPosRef = useRef<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: LANE_Z,
  });

  const [hudPos, setHudPos] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: LANE_Z,
  });

  // ── Trigger state (each fires once) ──
  const [collectedIds, setCollectedIds] = useState<Set<string>>(() => new Set());
  const [interactedNpcIds, setInteractedNpcIds] = useState<Set<string>>(() => new Set());
  const [quizTriggeredIds, setQuizTriggeredIds] = useState<Set<string>>(() => new Set());

  // ── Mock quiz event (mock only, no Firebase) ──
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const handlePosUpdate = useCallback((x: number, y: number, z: number) => {
    playerPosRef.current.x = x;
    playerPosRef.current.y = y;
    playerPosRef.current.z = z;
    setHudPos({ x, y, z });
  }, []);

  const handleCollectiblePickup = useCallback((id: string) => {
    setCollectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleNpcInteract = useCallback((id: string) => {
    setInteractedNpcIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleQuizTriggered = useCallback((id: string) => {
    setQuizTriggeredIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setActiveQuizId(id);
  }, []);

  const handleCloseQuiz = useCallback(() => {
    setActiveQuizId(null);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 400,
        background: "#1a1a2e",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 3, -10], fov: 55 }}
        frameloop="always"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Lights />
        <Ground />
        <Obstacles />

        {/* Mock gameplay objects */}
        {COLLECTIBLE_POSITIONS.map((c) => (
          <MockCollectible
            key={c.id}
            id={c.id}
            x={c.x}
            collected={collectedIds.has(c.id)}
          />
        ))}
        {MOCK_NPC_POSITIONS.map((n) => (
          <MockNPC
            key={n.id}
            id={n.id}
            x={n.x}
            interacted={interactedNpcIds.has(n.id)}
          />
        ))}
        {QUIZ_TRIGGER_POSITIONS.map((q) => (
          <MockQuizTrigger
            key={q.id}
            id={q.id}
            x={q.x}
            triggered={quizTriggeredIds.has(q.id)}
          />
        ))}

        <TestPlayer
          inputRef={inputRef}
          onPosUpdate={handlePosUpdate}
          onCollectiblePickup={handleCollectiblePickup}
          onNpcInteract={handleNpcInteract}
          onQuizTriggered={handleQuizTriggered}
          collectedIds={collectedIds}
          interactedNpcIds={interactedNpcIds}
          quizTriggeredIds={quizTriggeredIds}
        />

        {/* Production-ready camera, configured for the test bounds */}
        <CameraController playerPosRef={playerPosRef} bounds={TEST_CAMERA_BOUNDS} />
      </Canvas>

      <DebugHud
        x={hudPos.x}
        y={hudPos.y}
        z={hudPos.z}
        collected={Array.from(collectedIds)}
        npcInteracted={Array.from(interactedNpcIds)}
        quizTriggered={Array.from(quizTriggeredIds)}
      />

      {activeQuizId && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2,6,23,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(59,130,246,0.5)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 360,
              color: "#f1f5f9",
              fontFamily: "system-ui",
            }}
          >
            <div
              style={{
                color: "#60a5fa",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 8,
              }}
            >
              ✦ MOCK QUIZ EVENT
            </div>
            <h3 style={{ margin: "0 0 12px 0" }}>
              Trigger fired: {activeQuizId}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
              This is a mock quiz event. No data is written to production save,
              Firebase, or the leaderboard. Trigger fired exactly once.
            </p>
            <button
              type="button"
              onClick={handleCloseQuiz}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 16px",
                borderRadius: 10,
                background: "#3b82f6",
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
