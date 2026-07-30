/**
 * WordRun3D — Kiến trúc module rõ ràng.
 *
 * Module chia theo responsibility, thứ tự import:
 *   types → world → player → camera → renderer → flashcard → hud → game loop
 *
 * Kiến trúc cho phép thay thế Three.js bằng Unity WebGL bằng cách
 * implement lại các module bên dưới (player, camera, world, renderer)
 * mà không thay đổi game loop hay flashcard logic.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  1. TYPES — Định nghĩa giao diện chung cho mọi renderer
// ─────────────────────────────────────────────────────────────────────────────
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface QuizQuestion {
  card: FlashcardItem;
  options: string[]; // 4 phương án đã xáo trộn
  correctIndex: number;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
}

export interface GameState {
  status: "idle" | "playing" | "paused" | "won" | "lost";
  score: number;
  lives: number;
  combo: number;
  collected: number;
  totalCoins: number;
  activeQuestion: QuizQuestion | null;
  quizStatus: "idle" | "answering" | "correct" | "wrong";
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface PlayerData {
  position: Vector3;
  velocity: Vector3;
  onGround: boolean;
  facing: 1 | -1;
}

export interface ICoin {
  id: number;
  position: Vector3;
  collected: boolean;
  question: QuizQuestion;
}

export interface IRenderer {
  init(container: HTMLElement): void;
  dispose(): void;
  resize(): void;
}

export interface IPlayerController {
  update(dt: number, input: InputState): PlayerData;
  reset(): void;
}

export interface ICameraController {
  update(playerPos: Vector3): void;
}

export interface IWorld {
  update?(dt: number): void;
}

export interface IGameLoop {
  start(): void;
  stop(): void;
  reset(): void;
  dispatch(event: GameEvent): void;
}

export type GameEvent =
  | { type: "pickup"; coinId: number }
  | { type: "answer"; correct: boolean }
  | { type: "damage" }
  | { type: "win" }
  | { type: "restart" };
