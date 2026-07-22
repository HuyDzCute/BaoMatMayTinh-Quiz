"use client";

/**
 * Lightweight sound-effect (SFX) helper built on top of Howler.js.
 *
 * Why Howler?
 *   - Cross-browser (handles the WebAudio vs HTMLAudio mess internally).
 *   - Preloads files in the background so the first play has no delay.
 *   - Volume + mute are centralized here, so toggling on the Header instantly
 *     affects every consumer (Quiz, Match, Flashcards, …).
 *
 * Usage:
 *   import { playSfx, useSoundEnabled } from "@/lib/sound";
 *   playSfx("correct");
 *   const enabled = useSoundEnabled(); // re-renders when toggled
 *
 * Files live under /public/sounds/*.mp3 — Next.js serves them at /sounds/*.
 */

import { Howl } from "howler";
import { useCallback, useEffect, useRef, useState } from "react";

/** Catalog of named SFX. Each entry maps to a file in /public/sounds/. */
export type SfxName =
  | "correct"
  | "wrong"
  | "click"
  | "complete"
  | "tick"
  | "flip";

const SOUND_DIR = "/sounds";

/**
 * Default volume for each effect (0–1). Some events (correct / complete)
 * feel rewarding at full volume; mechanical noises (tick / flip / click)
 * stay quieter so they don't fatigue the player.
 */
const VOLUME_BY_SFX: Record<SfxName, number> = {
  correct: 0.7,
  complete: 0.7,
  wrong: 0.6,
  click: 0.45,
  tick: 0.4,
  flip: 0.5,
};

const STORAGE_KEY = "qthtm_sound_enabled";

/** Module-level cache so we only build each Howl once. */
const howlCache = new Map<SfxName, Howl>();

/** Last-known enabled state, mirrored for non-React callers. */
let enabledSnapshot = true;
const enabledListeners = new Set<(v: boolean) => void>();

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  // Default = enabled (true). Only an explicit "0" / "false" turns it off.
  return raw === null ? true : !(raw === "0" || raw === "false");
}

function writeEnabled(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  enabledSnapshot = v;
  enabledListeners.forEach((cb) => cb(v));
}

function getHowl(name: SfxName): Howl {
  const cached = howlCache.get(name);
  if (cached) return cached;

  const howl = new Howl({
    src: [`${SOUND_DIR}/${name}.mp3`],
    volume: VOLUME_BY_SFX[name],
    // html5: false keeps latency low. The files are tiny (<50 KB each),
    // so loading them into WebAudio is fine and avoids the HTMLAudio
    // minimum-size restriction on iOS Safari.
    preload: true,
    // Don't spam identical sounds within ~50 ms — protects against
    // accidental double-fires (e.g. clicking the same button twice
    // in one frame) while still feeling responsive.
    onend: () => {
      lastPlayedAt.delete(name);
    },
  });
  howlCache.set(name, howl);
  return howl;
}

/** Track the most recent play timestamp per effect so we can debounce. */
const lastPlayedAt = new Map<SfxName, number>();
const MIN_REPLAY_MS = 50;

/**
 * Play a sound effect. Safe to call from anywhere (client-only).
 * No-op when sound is muted, the file hasn't loaded yet, or the
 * browser blocked audio before the first user gesture (browsers
 * require a gesture before any sound — Howler silently swallows the
 * call in that case, which is fine; the next gesture unlocks it).
 */
export function playSfx(name: SfxName): void {
  if (typeof window === "undefined") return;
  if (!enabledSnapshot) return;

  const now = performance.now();
  const prev = lastPlayedAt.get(name) ?? 0;
  if (now - prev < MIN_REPLAY_MS) return;
  lastPlayedAt.set(name, now);

  try {
    const howl = getHowl(name);
    howl.play();
  } catch {
    /* swallow — audio must never break the game */
  }
}

/**
 * React hook: returns the current enabled flag and a stable setter.
 * Components that need to *react* to the toggle (e.g. the Header button
 * to update its icon) should call `useSoundEnabled()`. Pure event sites
 * (correct-answer effects, flip sounds) just call `playSfx()` directly.
 */
export function useSoundEnabled(): {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
} {
  // SSR starts in the "safe" state. After mount we read localStorage
  // and update — same pattern the Header already uses for theme.
  const [enabled, setEnabledState] = useState<boolean>(true);

  // Stable refs so the returned setter has a stable identity.
  const setEnabledRef = useRef<(v: boolean) => void>(() => {});

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- must read localStorage after mount to avoid hydration mismatch */
    const initial = readEnabled();
    enabledSnapshot = initial;
    setEnabledState(initial);
    /* eslint-enable react-hooks/set-state-in-effect */

    setEnabledRef.current = (v: boolean) => {
      writeEnabled(v);
      setEnabledState(v);
    };

    // Subscribe to programmatic changes (e.g. from another component).
    const cb = (v: boolean) => setEnabledState(v);
    enabledListeners.add(cb);
    return () => {
      enabledListeners.delete(cb);
    };
  }, []);

  const setEnabled = useCallback((v: boolean) => setEnabledRef.current(v), []);
  const toggle = useCallback(() => setEnabledRef.current(!enabledSnapshot), []);

  return { enabled, setEnabled, toggle };
}

/**
 * Tear-down helper for tests / hot-reload — drops the Howl cache.
 * Not used in production code paths.
 */
export function _resetSoundCacheForTests(): void {
  howlCache.forEach((h) => h.unload());
  howlCache.clear();
  lastPlayedAt.clear();
}