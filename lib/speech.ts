/**
 * Text-to-Speech helper using the browser's built-in Web Speech API.
 * Works offline once voices are loaded. Free, no API keys required.
 *
 * Usage:
 *   import { speak, stopSpeaking, pickVoice } from "@/lib/speech";
 *   speak("你好");                  // speaks using best matching voice
 *   speak("你好", { lang: "zh-CN" }); // explicit language
 *   stopSpeaking();
 */

export interface SpeakOptions {
  /** BCP-47 language tag, e.g. "zh-CN", "en-US", "vi-VN". */
  lang?: string;
  /** Speech rate 0.1 - 10 (default 1). */
  rate?: number;
  /** Pitch 0 - 2 (default 1). */
  pitch?: number;
  /** Volume 0 - 1 (default 1). */
  volume?: number;
}

/** In-memory cache of available voices (browsers load these asynchronously). */
let voicesCache: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const cached = synth.getVoices();
    if (cached.length > 0) {
      voicesCache = cached;
      resolve(cached);
      return;
    }
    const handler = () => {
      const v = synth.getVoices();
      voicesCache = v;
      synth.removeEventListener("voiceschanged", handler);
      resolve(v);
    };
    synth.addEventListener("voiceschanged", handler);
    // Fallback: some browsers never fire voiceschanged
    setTimeout(() => {
      const v = synth.getVoices();
      if (v.length > 0 && !voicesCache) {
        voicesCache = v;
        synth.removeEventListener("voiceschanged", handler);
        resolve(v);
      }
    }, 800);
  });
}

/**
 * Pick the best voice for a given language. Falls back gracefully:
 *   zh-CN  → any zh-* voice
 *   en-US  → any en-* voice
 *   vi-VN  → any vi-* voice
 *   else   → first available voice
 */
export function pickVoice(lang?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = voicesCache ?? window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  if (!lang) return voices[0] ?? null;

  const langLower = lang.toLowerCase();
  const base = langLower.split("-")[0];
  // Exact match first
  const exact = voices.find((v) => v.lang.toLowerCase() === langLower);
  if (exact) return exact;
  // Base language match (e.g. "zh")
  const baseMatch = voices.find((v) => v.lang.toLowerCase().startsWith(base));
  if (baseMatch) return baseMatch;
  // Google / Microsoft network voices often have good quality for any lang
  const remote = voices.find(
    (v) => v.localService === false && v.lang.toLowerCase().startsWith(base),
  );
  if (remote) return remote;
  return voices[0] ?? null;
}

/** Returns true if TTS is supported in this environment. */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Stop any in-progress speech. */
export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/** Result of a `speak()` call. */
export interface SpeakResult {
  /** True when the utterance reached its natural end (the listener's
   *  `onend` fired). False if it was cut short by an error, an explicit
   *  cancel, or the 8 s safety-net timer. */
  ok: boolean;
  /** How the utterance ended. `ended` = onend fired, `cancelled` =
   *  `synth.cancel()` ran, `error` = an `onerror` fired, `timeout` =
   *  the 8 s safety-net fired. */
  ended: "ended" | "cancelled" | "error" | "timeout";
  /** The `SpeechSynthesisErrorEvent.error` string when ended === "error". */
  errorMessage?: string;
}

/**
 * Speak the given text. Returns a Promise that resolves when speech ends.
 * Cancels any ongoing speech first to prevent overlap.
 *
 * The promise resolves to a `SpeakResult` so callers can distinguish a
 * genuine end-of-utterance from a cancel/timeout. The previous version
 * resolved with `void` and silently swallowed `onerror`, which made UI
 * sequencing ("show Next button only after speech ends") unreliable on
 * Safari (which fires `onerror` after `synth.cancel()`).
 *
 * @param text - The text to speak. Empty/whitespace strings are ignored
 *               and the promise resolves as `{ ok: true, ended: "ended" }`
 *               without producing audio.
 * @param options - Optional language/rate/pitch/volume overrides.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<SpeakResult> {
  if (!isSpeechSupported()) return { ok: false, ended: "error", errorMessage: "speechSynthesis unavailable" };
  const trimmed = text?.trim();
  if (!trimmed) return { ok: true, ended: "ended" };

  // Ensure voices are loaded
  await loadVoices();
  const synth = window.speechSynthesis;
  try {
    // Cancel any previous utterance *before* queueing ours. Some older
    // Chromium builds had a race where cancel + immediate speak would
    // swallow the new utterance; keeping cancel() here (rather than inside
    // the promise body) preserves the original behavior on modern browsers.
    synth.cancel();
  } catch {
    /* ignore */
  }

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(trimmed);
    const lang = options.lang ?? detectLang(trimmed);
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    if (options.lang) utter.lang = options.lang;
    else if (voice) utter.lang = voice.lang;
    if (typeof options.rate === "number") utter.rate = options.rate;
    if (typeof options.pitch === "number") utter.pitch = options.pitch;
    if (typeof options.volume === "number") utter.volume = options.volume;

    let settled = false;
    const settle = (result: SpeakResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      resolve(result);
    };

    utter.onend = () => settle({ ok: true, ended: "ended" });
    utter.onerror = (ev: SpeechSynthesisErrorEvent) => {
      // SpeechSynthesisErrorEvent.error is "interrupted" on Safari when we
      // call cancel() right after speak(). That counts as "cancelled",
      // not a hard error — UI code can treat them the same.
      const msg = ev?.error;
      settle(
        msg === "interrupted" || msg === "canceled"
          ? { ok: false, ended: "cancelled" }
          : { ok: false, ended: "error", errorMessage: msg },
      );
    };

    // Safety net: never hang longer than 8 s. If `onend` later fires for
    // a slow first-run utterance, `settle()` is idempotent and the second
    // resolution is dropped.
    const safety = setTimeout(
      () => settle({ ok: false, ended: "timeout" }),
      8000,
    );

    try {
      synth.speak(utter);
    } catch (err) {
      settle({
        ok: false,
        ended: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

/** Heuristic language detection for common flashcard content. */
export function detectLang(text: string): string {
  if (!text) return "en-US";
  // CJK Unified Ideographs (Chinese, Japanese kanji, Korean hanja)
  if (/[\u4e00-\u9fff]/.test(text)) {
    // Hiragana/Katakana → Japanese
    if (/[\u3040-\u30ff]/.test(text)) return "ja-JP";
    // Hangul → Korean
    if (/[\uac00-\ud7af]/.test(text)) return "ko-KR";
    return "zh-CN";
  }
  // Vietnamese diacritics (ă, â, đ, ê, ô, ơ, ư, plus tone marks)
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]/.test(text)) return "vi-VN";
  // Latin with no Vietnamese diacritics → default English
  return "en-US";
}