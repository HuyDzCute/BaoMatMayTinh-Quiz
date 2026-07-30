/**
 * WordRun3D — Main Game Component
 *
 * Feature 1-10: Tổng hợp tất cả modules.
 * Canvas dùng frameloop="always" để render ổn định.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { WorldScene } from "./WorldScene";
import { CameraController } from "./CameraController";
import { NPCController } from "./NPCModule";
import { QuizModal, type QuizResult } from "./FlashcardModule";
import { GameHUD, useNotifications } from "./HudModule";
import { buildQuizQuestions } from "@/lib/wordrun-game-data";
import { loadGame, saveGame, clearSave } from "@/lib/wordrun-save";
import { WORLD } from "./WorldScene";
import type { GameState, Vector3 } from "@/lib/wordrun-types";
import { GamePlayer, GamePlayerIntegrated } from "@/lib/game/player";

// Extended input state with forward/backward and run
interface ExtendedInputState {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  jump: boolean;
  run: boolean;
}

// NPC positions — shared between game and camera
const NPC_POSITIONS = [14, 32, 52] as const;

export default function WordRunGame() {
  // ── Input ──
  const inputRef = useRef<ExtendedInputState>({
    left: false,
    right: false,
    forward: false,
    backward: false,
    jump: false,
    run: false,
  });

  // ── Player position ──
  const playerPosRef = useRef<Vector3>({
    x: WORLD.START_X,
    y: WORLD.GROUND_Y + WORLD.PLAYER_RADIUS,
    z: 0,
  });

  // ── Game state ──
  const [gameState, setGameState] = useState<GameState>({
    status: "playing",
    score: 0,
    lives: 3,
    combo: 0,
    collected: 0,
    totalCoins: WORLD.NPC_COUNT,
    activeQuestion: null,
    quizStatus: "idle",
  });

  // ── NPCs ──
  const [npcsInteracted, setNpcsInteracted] = useState<boolean[]>(
    () => Array(WORLD.NPC_COUNT).fill(false),
  );
  const [nearbyNPC, setNearbyNPC] = useState<number | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [activeDialogueNPC, setActiveDialogueNPC] = useState<number | null>(null);

  // ── Questions (pre-built per NPC) ──
  const questions = useMemo(() => buildQuizQuestions(WORLD.NPC_COUNT), []);

  // ── Notifications ──
  const { notifications, push } = useNotifications();

  // ── Load saved game on mount ──
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const saved = loadGame();
    if (saved && saved.collected < WORLD.NPC_COUNT) {
      setGameState((prev) => ({
        ...prev,
        score: saved.score,
        lives: saved.lives,
        combo: saved.combo,
        collected: saved.collected,
      }));
      setNpcsInteracted((prev) => {
        const next = [...prev];
        for (let i = 0; i < saved.collected; i++) next[i] = true;
        return next;
      });
    }
    setInitialized(true);
  }, []);

  // ── Auto-save on game state changes ──
  useEffect(() => {
    if (!initialized) return;
    if (gameState.status === "won" || gameState.status === "lost") return;
    if (gameState.activeQuestion) return;
    saveGame(gameState);
  }, [gameState.score, gameState.lives, gameState.combo, gameState.collected, initialized]);

  // ── Keyboard input ──
  useEffect(() => {
    // Extended keyboard mapping
    const onDown = (e: KeyboardEvent) => {
      // E key for NPC interaction
      if (e.code === "KeyE" && nearbyNPC !== null && !showDialogue && gameState.status === "playing" && gameState.quizStatus === "idle") {
        e.preventDefault();
        setActiveDialogueNPC(nearbyNPC);
        setShowDialogue(true);
        return;
      }
      // Escape key
      if (e.code === "Escape") {
        e.preventDefault();
        if (showDialogue) {
          setShowDialogue(false);
          setActiveDialogueNPC(null);
        } else if (gameState.quizStatus !== "idle") {
          setGameState((prev) => ({
            ...prev,
            activeQuestion: null,
            quizStatus: "idle",
          }));
        }
        return;
      }
      // Movement keys
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          e.preventDefault();
          inputRef.current.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          e.preventDefault();
          inputRef.current.right = true;
          break;
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          inputRef.current.forward = true;
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          inputRef.current.backward = true;
          break;
        case "Space":
          e.preventDefault();
          inputRef.current.jump = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          e.preventDefault();
          inputRef.current.run = true;
          break;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          inputRef.current.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          inputRef.current.right = false;
          break;
        case "ArrowUp":
        case "KeyW":
          inputRef.current.forward = false;
          break;
        case "ArrowDown":
        case "KeyS":
          inputRef.current.backward = false;
          break;
        case "Space":
          inputRef.current.jump = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          inputRef.current.run = false;
          break;
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [nearbyNPC, showDialogue, gameState.status, gameState.quizStatus]);

  // ── Nearby NPC ──
  const handleNearbyNPC = useCallback((npcIdx: number | null) => {
    setNearbyNPC(npcIdx);
  }, []);

  // ── Start Quiz from dialogue ──
  const handleStartQuiz = useCallback(
    (npcIdx: number) => {
      if (npcsInteracted[npcIdx]) {
        setShowDialogue(false);
        setActiveDialogueNPC(null);
        return;
      }
      setShowDialogue(false);
      setNpcsInteracted((prev) => {
        const next = [...prev];
        next[npcIdx] = true;
        return next;
      });
      setGameState((prev) => ({
        ...prev,
        activeQuestion: questions[npcIdx],
        quizStatus: "answering",
      }));
    },
    [npcsInteracted, questions],
  );

  // ── Handle answer ──
  const handleAnswer = useCallback(
    (chosenIdx: number) => {
      const q = gameState.activeQuestion;
      if (!q) return;
      const correct = chosenIdx === q.correctIndex;
      const result: QuizResult = correct ? "correct" : "wrong";

      if (correct) {
        setGameState((prev) => {
          const nextCollected = prev.collected + 1;
          const won = nextCollected >= prev.totalCoins;
          return {
            ...prev,
            score: prev.score + 10,
            combo: prev.combo + 1,
            collected: nextCollected,
            status: won ? "won" : "playing",
            quizStatus: result,
          };
        });
        const newCombo = gameState.combo + 1;
        if (newCombo >= 3) {
          push(`Combo x${newCombo}!`, "#f97316", "⚡");
        } else {
          push("+10", "#fbbf24", "✨");
        }
      } else {
        setGameState((prev) => {
          const nextLives = prev.lives - 1;
          return {
            ...prev,
            lives: Math.max(0, nextLives),
            combo: 0,
            status: nextLives <= 0 ? "lost" : "playing",
            quizStatus: result,
          };
        });
        push("-1 Heart", "#ef4444", "💔");
      }
    },
    [gameState.activeQuestion, gameState.combo, push],
  );

  // ── Retry quiz (same question) ──
  const handleQuizRetry = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      quizStatus: "answering",
    }));
  }, []);

  // ── Leave quiz ──
  const handleQuizLeave = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      activeQuestion: null,
      quizStatus: "idle",
    }));
  }, []);

  // ── Leave dialogue ──
  const handleLeave = useCallback(() => {
    setShowDialogue(false);
    setActiveDialogueNPC(null);
  }, []);

  // ── Pause ──
  const handlePause = useCallback(() => {
    // For now, just log — pause menu can be added later
    console.log("Pause clicked");
  }, []);

  // ── Handle fall ──
  const handleFall = useCallback(() => {
    setGameState((prev) => {
      const nextLives = prev.lives - 1;
      return {
        ...prev,
        lives: Math.max(0, nextLives),
        status: nextLives <= 0 ? "lost" : "playing",
      };
    });
  }, []);

  // ── Restart ──
  const handleRestart = useCallback(() => {
    clearSave();
    setGameState({
      status: "playing",
      score: 0,
      lives: 3,
      combo: 0,
      collected: 0,
      totalCoins: WORLD.NPC_COUNT,
      activeQuestion: null,
      quizStatus: "idle",
    });
    setNpcsInteracted(Array(WORLD.NPC_COUNT).fill(false));
    setNearbyNPC(null);
    setShowDialogue(false);
    setActiveDialogueNPC(null);
    playerPosRef.current = {
      x: WORLD.START_X,
      y: WORLD.GROUND_Y + WORLD.PLAYER_RADIUS,
      z: 0,
    };
  }, []);

  // ── Player position update ──
  const handlePlayerPos = useCallback((pos: Vector3) => {
    playerPosRef.current = pos;
  }, []);

  const gamePaused = gameState.status !== "playing";
  const interactionPaused = showDialogue || gameState.quizStatus !== "idle";
  const paused = gamePaused || interactionPaused;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        backgroundColor: "#0a0f1e",
      }}
    >
      {/* ── Three.js Canvas ─────────────────────────────────────────────── */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#1a1a2e"), 1);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        camera={{ position: [WORLD.START_X + 4, 3, 10], fov: 52 }}
        frameloop="always"
        style={{ display: "block", width: "100%", height: 400 }}
      >
        <CameraController
          playerPosRef={playerPosRef}
          dialogueOpen={showDialogue}
          targetNPCX={
            showDialogue && activeDialogueNPC !== null
              ? NPC_POSITIONS[activeDialogueNPC]
              : null
          }
        />
        <WorldScene />
        <GamePlayerIntegrated
          initialPosition={{
            x: WORLD.START_X,
            y: WORLD.GROUND_Y + WORLD.PLAYER_RADIUS,
            z: 0,
          }}
          externalInputRef={inputRef}
          enableCamera={false}
          onPositionUpdate={(pos: { x: number; y: number; z: number }) => {
            playerPosRef.current = pos;
          }}
        />
        <NPCController
          interacted={npcsInteracted}
          playerPosRef={playerPosRef}
          onNearbyNPC={handleNearbyNPC}
          onStartQuiz={handleStartQuiz}
          showDialogue={showDialogue}
          activeDialogueNPC={activeDialogueNPC}
          paused={paused}
        />
      </Canvas>

      {/* ── HUD ──────────────────────────────────────────────────────── */}
      <GameHUD
        state={gameState}
        onRestart={handleRestart}
        onPause={handlePause}
        inputRef={inputRef}
        notifications={notifications}
      />

      {/* ── Dialogue Overlay ─────────────────────────────────────────── */}
      {showDialogue && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 32,
            pointerEvents: "auto",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: 16,
              padding: "20px 24px",
              minWidth: 280,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: 8,
              }}
            >
              ✦ Vocabulary Practice
            </div>
            <div
              style={{
                color: "#f1f5f9",
                fontSize: 15,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              &ldquo;Hello! Ready to practice English?&rdquo;
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => handleStartQuiz(activeDialogueNPC!)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter, sans-serif)",
                  boxShadow: "0 0 16px rgba(59,130,246,0.4)",
                }}
              >
                Start Quiz
              </button>
              <button
                type="button"
                onClick={handleLeave}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "rgba(51,65,85,0.5)",
                  color: "#94a3b8",
                  border: "1px solid rgba(148,163,184,0.2)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter, sans-serif)",
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Modal ───────────────────────────────────────────────── */}
      {gameState.activeQuestion && gameState.quizStatus !== "idle" && (
        <QuizModal
          question={gameState.activeQuestion}
          result={
            gameState.quizStatus === "correct"
              ? "correct"
              : gameState.quizStatus === "wrong"
                ? "wrong"
                : null
          }
          onAnswer={handleAnswer}
          onRetry={handleQuizRetry}
          onLeave={handleQuizLeave}
        />
      )}
    </div>
  );
}
