/**
 * WordRun3D — Save System
 *
 * Feature 9: LocalStorage persistence.
 * Saves: hearts, score, combo, completed NPCs.
 */
"use client";

import type { GameState } from "./wordrun-types";

const SAVE_KEY = "wordrun3d_save";
const MAX_NPCS = 3;

export interface SavedGame {
  score: number;
  lives: number;
  combo: number;
  collected: number;
  totalCoins: number;
  timestamp: number;
}

export function saveGame(state: Partial<GameState>): void {
  if (typeof window === "undefined") return;
  try {
    const data: SavedGame = {
      score: state.score ?? 0,
      lives: state.lives ?? 3,
      combo: state.combo ?? 0,
      collected: state.collected ?? 0,
      totalCoins: state.totalCoins ?? MAX_NPCS,
      timestamp: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function loadGame(): SavedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedGame;
    // Validate
    if (typeof data.score !== "number") return null;
    if (typeof data.lives !== "number") return null;
    if (typeof data.collected !== "number") return null;
    if (typeof data.combo !== "number") return null;
    // Max age: 24 hours
    if (Date.now() - data.timestamp > 86_400_000) {
      clearSave();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
