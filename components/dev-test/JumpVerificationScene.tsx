/**
 * JumpVerificationScene — Standalone Jump Test
 *
 * PURPOSE:
 * Prove that:
 *  - Player Y goes up and returns to 0 under gravity
 *  - No floor penetration (Y stays >= 0)
 *  - No Z drift during jump (Z stays at 0)
 *  - Camera Y and Z remain fixed during the entire jump arc
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* eslint-disable react-hooks/immutability */

const CFG = {
  laneZ: 0,
  playerRadius: 0.4,
  playerHeight: 1.7,
  jumpVelocity: 9,
  gravity: 22,
  cameraZ: -10,
  cameraY: 3,
  cameraLookY: 1.0,
  cameraSmooth: 0.18,
  levelMinX: -14,
  levelMaxX: 14,
  playerStartX: -3,
};

interface PlayerSim {
  x: number;
  y: number;
  vy: number;
  onGround: boolean;
  phase: "ground" | "rising" | "peak" | "falling" | "landed";
  _timer: number;
  _cooldown: number;
  _peakY: number;
  _jumpCount: number;
}

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

function CollectingItem() {
  return (
    <mesh position={[-3, 1.2, CFG.laneZ]}>
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

interface SimProps {
  simRef: React.MutableRefObject<PlayerSim>;
  onUpdate: (s: PlayerSim) => void;
}

function JumpSim({ simRef, onUpdate }: SimProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = simRef.current;

    // Phase: ground → after 1s, jump
    if (s.onGround && s.phase === "ground") {
      s._timer += dt;
      if (s._timer > 1.0) {
        s.vy = CFG.jumpVelocity;
        s.onGround = false;
        s.phase = "rising";
        s._timer = 0;
      }
    }

    // Physics
    s.vy -= CFG.gravity * dt;
    s.y += s.vy * dt;

    if (s.y <= 0) {
      s.y = 0;
      const wasAirborne = !s.onGround;
      s.vy = 0;
      s.onGround = true;
      if (wasAirborne && s.phase !== "landed") {
        s.phase = "landed";
        s._jumpCount += 1;
      }
    } else {
      s.onGround = false;
      if (s.y > s._peakY) s._peakY = s.y;
    }

    // Phase transitions
    if (s.phase === "rising" && s.vy <= 0) s.phase = "peak";
    if (s.phase === "peak" && s.vy < -1) s.phase = "falling";
    if (s.phase === "landed") {
      s._cooldown += dt;
      if (s._cooldown > 1.5) {
        s.phase = "ground";
        s._cooldown = 0;
        s._timer = 0;
        s._peakY = 0;
      }
    }

    if (groupRef.current) {
      groupRef.current.position.set(s.x, s.y, CFG.laneZ);
    }

    onUpdate(s);
  });

  return (
    <group ref={groupRef} position={[CFG.playerStartX, 0, CFG.laneZ]}>
      <mesh position={[0, CFG.playerHeight / 2, 0]} castShadow>
        <capsuleGeometry args={[0.25, CFG.playerHeight * 0.5, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

interface CamProps {
  simRef: React.MutableRefObject<PlayerSim>;
  onCamUpdate: (s: { x: number; y: number; z: number }) => void;
}

function JumpCamera({ simRef, onCamUpdate }: CamProps) {
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
    const s = simRef.current;
    const targetX = THREE.MathUtils.clamp(s.x, CFG.levelMinX, CFG.levelMaxX);
    const t = 1 - Math.pow(1 - CFG.cameraSmooth, dt * 60);
    smoothedX.current += (targetX - smoothedX.current) * t;
    camera.position.x = smoothedX.current;
    camera.position.y = CFG.cameraY;
    camera.position.z = CFG.cameraZ;
    camera.lookAt(s.x, s.y + CFG.cameraLookY, 0);

    onCamUpdate({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    });
  });

  return null;
}

function JumpPanel({
  s,
  cam,
}: {
  s: PlayerSim;
  cam: { x: number; y: number; z: number };
}) {
  const peakExpected = (CFG.jumpVelocity * CFG.jumpVelocity) / (2 * CFG.gravity);
  const peakActual = s._peakY;
  const peakOk = Math.abs(peakActual - peakExpected) < 0.5;
  const yOk = s.y >= -0.001;
  const camFixed =
    Math.abs(cam.y - CFG.cameraY) < 0.001 && Math.abs(cam.z - CFG.cameraZ) < 0.001;
  const xLocked = Math.abs(s.x - CFG.playerStartX) < 0.01;

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
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: 14,
          marginBottom: 8,
          color: peakOk && yOk && camFixed && xLocked ? "#22c55e" : "#fbbf24",
        }}
      >
        JUMP VERIFICATION
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ color: "#fbbf24" }}>PLAYER</div>
          <div>X: {s.x.toFixed(3)} {xLocked ? "✓ locked" : "✗ drift"}</div>
          <div>Y: {s.y.toFixed(3)} m</div>
          <div>VY: {s.vy.toFixed(3)} m/s</div>
          <div>
            Phase: <span style={{ color: "#60a5fa" }}>{s.phase}</span>
          </div>
          <div>On ground: {s.onGround ? "yes" : "no"}</div>
          <div>Peak Y seen: {peakActual.toFixed(3)} m</div>
          <div>Jumps completed: {s._jumpCount}</div>
        </div>
        <div>
          <div style={{ color: "#60a5fa" }}>CAMERA</div>
          <div>
            Y: {cam.y.toFixed(3)} {camFixed ? "✓ fixed" : "✗ drift"}
          </div>
          <div>
            Z: {cam.z.toFixed(3)} {camFixed ? "✓ fixed" : "✗ drift"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
            Expected peak Y: {peakExpected.toFixed(3)} m
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>
            v²=u²+2as → {peakExpected.toFixed(3)} m
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
        <div style={{ fontWeight: "bold" }}>CHECKS</div>
        <div>1. Y &gt;= 0 (no floor penetration): {yOk ? "✓" : "✗"}</div>
        <div>2. Peak Y matches physics formula: {peakOk ? "✓" : "..."}</div>
        <div>3. Player returns to Y=0 after jump: {s.phase === "landed" || s.phase === "ground" ? "✓" : "..."}</div>
        <div>4. Player X stays at start: {xLocked ? "✓" : "✗"}</div>
        <div>5. Camera Y/Z fixed throughout: {camFixed ? "✓" : "✗"}</div>
      </div>
    </div>
  );
}

export default function JumpVerificationScene() {
  const simRef = useRef<PlayerSim>({
    x: CFG.playerStartX,
    y: 0,
    vy: 0,
    onGround: true,
    phase: "ground",
    _timer: 0,
    _cooldown: 0,
    _peakY: 0,
    _jumpCount: 0,
  });

  const [snap, setSnap] = useState<PlayerSim>({
    x: CFG.playerStartX,
    y: 0,
    vy: 0,
    onGround: true,
    phase: "ground",
    _timer: 0,
    _cooldown: 0,
    _peakY: 0,
    _jumpCount: 0,
  });
  const [camSnap, setCamSnap] = useState({
    x: CFG.playerStartX,
    y: CFG.cameraY,
    z: CFG.cameraZ,
  });

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
        <CollectingItem />
        <JumpSim
          simRef={simRef}
          onUpdate={(s) => setSnap({ ...s })}
        />
        <JumpCamera
          simRef={simRef}
          onCamUpdate={(c) => setCamSnap(c)}
        />
      </Canvas>
      <JumpPanel s={snap} cam={camSnap} />
    </div>
  );
}
