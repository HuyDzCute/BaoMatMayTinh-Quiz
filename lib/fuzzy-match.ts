/**
 * Fuzzy answer matching for flashcard test mode.
 *
 * Handles:
 *  - case-insensitive comparison
 *  - whitespace normalization
 *  - punctuation stripping
 *  - Vietnamese diacritics tolerance (cho phep/goi phep đều đúng)
 *  - multiple acceptable answers separated by " / " or ";"
 *  - Levenshtein distance fallback for typos
 *
 * Returns a score from 0 (no match) to 1 (perfect match).
 */

const DIACRITICS: Record<string, string> = {
  // Vietnamese
  "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
  "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
  "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
  "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
  "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e",
  "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
  "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
  "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
  "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
  "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
  "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u",
  "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
  "đ": "d",
};

/**
 * Strip diacritics for tolerant comparison.
 *
 * The DIACRITICS table above contains only lowercase entries (e.g. `đ`),
 * so an uppercase input like `"Đại học"` would otherwise pass through
 * un-stripped. We lowercase the candidate character *before* the lookup,
 * which makes the function correct for any input. The table is populated
 * with the canonical lowercase forms.
 */
function stripDiacritics(s: string): string {
  return s
    .split("")
    .map((c) => {
      const lower = c.toLowerCase();
      return DIACRITICS[lower] ?? c;
    })
    .join("");
}

/** Normalize an answer string for comparison. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    // Strip punctuation except internal hyphens and apostrophes
    .replace(/[.,;:!?"()\[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

/** Get all acceptable answers from a card's back field. */
export function getAcceptableAnswers(back: string): string[] {
  // Split on common separators: " / ", " ; ", ",", ";"
  return back
    .split(/\s*(?:\/|\||;|,)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Levenshtein distance between two strings, with a small LRU cache.
 *
 * Memoization matters because `generateDistractors` calls this for every
 * (target, candidate) pair in the deck on every choice-mode build — for a
 * 500-card deck that's ~25K allocations of the inner `dp` matrix per
 * render. Caching by sorted pair also de-duplicates `levenshtein(a, b)`
 * vs `levenshtein(b, a)` calls.
 *
 * The cache is intentionally bounded so a very long session can't grow
 * it without limit; 5000 entries × ~24 bytes/key ≈ a few hundred KB at
 * worst, well under any practical memory budget.
 */
const LEVENSHTEIN_CACHE_MAX = 5000;
const levenshteinCache = new Map<string, number>();

function cacheKey(a: string, b: string): string {
  return a.length <= b.length ? `${a}|${b}` : `${b}|${a}`;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const key = cacheKey(a, b);
  const cached = levenshteinCache.get(key);
  if (cached !== undefined) return cached;

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  const result = dp[a.length][b.length];

  // Drop the oldest entry once we exceed the bound. Map iteration is
  // insertion-ordered, so the first key is the oldest.
  if (levenshteinCache.size >= LEVENSHTEIN_CACHE_MAX) {
    const oldest = levenshteinCache.keys().next().value;
    if (oldest !== undefined) levenshteinCache.delete(oldest);
  }
  levenshteinCache.set(key, result);
  return result;
}

/** Drop the memoization cache. Useful for tests. */
export function _resetLevenshteinCache(): void {
  levenshteinCache.clear();
}

/** Similarity score 0..1 based on Levenshtein distance. */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const dist = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  return 1 - dist / longest;
}

/**
 * Score the user's typed answer against the card's acceptable answers.
 * Returns { score, bestMatch, exact }.
 */
export function scoreAnswer(
  userInput: string,
  cardBack: string,
): { score: number; bestMatch: string; exact: boolean } {
  const userNorm = normalizeAnswer(userInput);
  if (!userNorm) return { score: 0, bestMatch: "", exact: false };

  const accepted = getAcceptableAnswers(cardBack);
  let bestScore = 0;
  let bestMatch = "";

  for (const ans of accepted) {
    const ansNorm = normalizeAnswer(ans);

    // 1. Exact match (case/punct insensitive)
    if (userNorm === ansNorm) {
      return { score: 1, bestMatch: ans, exact: true };
    }

    // 2. Diacritic-insensitive match
    const userNoDia = stripDiacritics(userNorm);
    const ansNoDia = stripDiacritics(ansNorm);
    if (userNoDia && userNoDia === ansNoDia) {
      return { score: 1, bestMatch: ans, exact: true };
    }

    // 3. Substring containment (e.g. user types a longer description)
    const scoreSubstring =
      userNoDia.length >= 3 &&
      (userNoDia.includes(ansNoDia) || ansNoDia.includes(userNoDia))
        ? 0.85
        : 0;

    // 4. Levenshtein similarity (typo tolerance)
    const sim = similarity(userNoDia, ansNoDia);

    const final = Math.max(scoreSubstring, sim);
    if (final > bestScore) {
      bestScore = final;
      bestMatch = ans;
    }
  }

  return {
    score: Math.min(1, bestScore),
    bestMatch,
    exact: bestScore >= 0.99,
  };
}

/**
 * Pick an SRS rating from a similarity score.
 *  ≥ 0.99 → "easy"   (perfect)
 *  ≥ 0.85 → "good"   (correct, close enough)
 *  ≥ 0.6  → "hard"   (partial credit — typo but recognizable)
 *  <  0.6 → "again"  (wrong)
 */
export function ratingFromScore(score: number): "again" | "hard" | "good" | "easy" {
  if (score >= 0.99) return "easy";
  if (score >= 0.85) return "good";
  if (score >= 0.6) return "hard";
  return "again";
}