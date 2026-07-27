/**
 * Parse the Oxford 3000 source text into clean JSON.
 *
 * Strategy:
 *   Walk raw lines. For each:
 *   - Topic header → flush pending row, set current topic.
 *   - Table header → skip.
 *   - Tab row → flush pending row, start new pending row.
 *   - Non-tab, non-blank → continuation of pending row (IPA or meaning).
 *
 * Repairs applied per row:
 *   A. POS column has stray IPA glued on → split into POS + IPA.
 *   B. IPA column missing leading slash → add.
 *   C. IPA + meaning merged in one cell → split at last "/".
 *   D. IPA not closed → absorb next non-tab lines as IPA continuation;
 *      stop at first "/" or at the next tab row.
 *   E. After IPA closed, non-tab lines are meaning wrap.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "oxford-source.txt");
const OUT = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

const POS_RE =
  /^(n|v|adj|adv|pre|phrasal\s+v|n\.\s*phr|v\.\s*phr|adj\/v|adj\/n|n\/adj|pre\/v|adj\/n|v\/n|pre\/adv)$/i;
const TOPIC_RE = /^(\d+)\.\s*(.+)$/;
const IPA_LIKE =
  /^[\sA-Za-zəɪʊɔæœɐɒɛɜɪʊʌɒɔəɛæœɤʌɡŋɹɻɺɫɬɮɱɳɴʎʟʒʃʝʈʈʂʐðθ\.\u02C8\u02CC\u0303\u0302\u0301\u0300\u0304ː'ˌˈ]+$/;
const POS_IPA_RE =
  /^([nv](?:\.\s*phr)?|adj|adv|pre|phrasal\s+v|adj\/v|adj\/n|n\/adj|pre\/v|adj\/n|v\/n|pre\/adv)\s+(\/[^\/\n]*)$/;

function hasViet(s) {
  return /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/.test(s);
}

function normalizeIpa(s) {
  s = (s || "").trim();
  if (!s) return s;
  if (!s.startsWith("/") && s.endsWith("/") && IPA_LIKE.test(s.slice(0, -1))) {
    return "/" + s;
  }
  return s;
}

function splitIpaMeaning(cell) {
  if (!cell) return null;
  const slashes = [];
  for (let i = 0; i < cell.length; i++) if (cell[i] === "/") slashes.push(i);
  if (slashes.length < 2) {
    // Single slash: IPA probably missing leading "/". Try splitting at it.
    if (slashes.length === 1) {
      const slashPos = slashes[0];
      const ipaPart = cell.slice(0, slashPos);
      const tail = cell.slice(slashPos + 1).trim();
      // Verify: ipaPart is IPA-like, tail is Vietnamese.
      if (IPA_LIKE.test(ipaPart) && hasViet(tail)) {
        return {
          ipa: "/" + ipaPart.replace(/\s+/g, "") + "/",
          meaning: tail,
        };
      }
    }
    return null;
  }
  // The IPA chunk is everything up to the LAST "/" (assuming the IPA is
  // closed by it). The tail is anything after. We then verify the tail
  // contains Vietnamese — only Vietnamese tails are valid "meaning"
  // candidates (IPA continuations are handled by the wrap branch instead).
  const lastSlash = slashes[slashes.length - 1];
  const ipaPart = cell.slice(0, lastSlash + 1);
  const tail = cell.slice(lastSlash + 1).trim();
  if (!ipaPart.startsWith("/")) return null;
  return { ipa: ipaPart.replace(/\s+/g, ""), meaning: tail };
}

function isTopicHeader(line) {
  const t = line.trim();
  return TOPIC_RE.test(t) && /Từ vựng\s+về/i.test(t);
}

function isTableHeader(line) {
  return /^Từ vựng\s+Từ loại\s+Phiên âm\s+Ý nghĩa\s*$/.test(line.trim());
}

function assembleRow(parts) {
  // parts: array of cells from a tab-separated row (possibly with repairs
  // applied).
  const posIdx = parts.findIndex((c) => POS_RE.test(c));
  if (posIdx < 0) return null;
  const word = parts.slice(0, posIdx).join(" ");
  const pos = parts[posIdx];
  const ipa = (parts[posIdx + 1] || "").replace(/\s+/g, " ").trim();
  const meaning = parts
    .slice(posIdx + 2)
    .join(" ")
    .trim();
  if (!word || !pos || !ipa) return null;
  return { word, pos, ipa, meaning };
}

function main() {
  const raw = fs.readFileSync(SRC, "utf8");
  const lines = raw.split(/\r?\n/);

  const topics = [];
  let cur = null;
  let pending = null; // current row being assembled

  function flush() {
    if (!pending) return;
    const row = assembleRow(pending);
    if (row && cur) cur.cards.push(row);
    pending = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/g, "");
    if (!line.trim()) continue;

    if (isTopicHeader(line)) {
      flush();
      const m = line.trim().match(TOPIC_RE);
      cur = {
        index: parseInt(m[1], 10),
        name: m[2].trim(),
        cards: [],
      };
      topics.push(cur);
      continue;
    }

    if (isTableHeader(line)) continue;

    if (line.includes("\t")) {
      flush();

      let parts = line.split("\t").map((c) => c.trim());

      // Case B: POS column has stray IPA glued on.
      let posIdx = parts.findIndex((c) => POS_RE.test(c));
      if (posIdx < 0) {
        for (let j = 1; j < parts.length; j++) {
          const m = parts[j].match(POS_IPA_RE);
          if (m) {
            parts = [...parts.slice(0, j), m[1].trim(), m[2], ...parts.slice(j + 1)];
            posIdx = j;
            break;
          }
        }
      }

      if (posIdx < 0) continue;

      // Case C: missing leading slash on IPA.
      const ipaIdx = posIdx + 1;
      if (ipaIdx < parts.length) {
        parts[ipaIdx] = normalizeIpa(parts[ipaIdx]);
      }

      // Case A: IPA + meaning merged.
      if (ipaIdx < parts.length) {
        const split = splitIpaMeaning(parts[ipaIdx]);
        if (split && split.meaning && hasViet(split.meaning)) {
          parts[ipaIdx] = split.ipa;
          parts.splice(ipaIdx + 1, 0, split.meaning);
        } else if (split && split.meaning && IPA_LIKE.test(split.meaning)) {
          // Tail is IPA continuation. Push to next-line continuation by
          // appending it to IPA and letting the loop's continuation branch
          // handle it. We do this by prepending the tail to the next line.
          parts[ipaIdx] = split.ipa;
          // We can't inject a line, so instead append the tail back to IPA
          // and let it close in the continuation branch.
          parts[ipaIdx] = split.ipa + " " + split.meaning;
        }
      }

      pending = parts;
      continue;
    }

    // No tab → continuation.
    if (!pending) continue;
    const text = line.trim();

    // Re-find POS in pending (may have shifted due to repairs).
    const posIdx2 = pending.findIndex((c) => POS_RE.test(c));
    if (posIdx2 < 0) {
      pending = null;
      continue;
    }
    const ipaIdx2 = posIdx2 + 1;
    const curIpa = pending[ipaIdx2] || "";

    if (curIpa && !curIpa.endsWith("/")) {
      // Append to IPA.
      const combined = (curIpa + " " + text).replace(/\s+/g, " ").trim();
      // If combined contains a closing slash, split IPA + remaining.
      const m = combined.match(/^(.*?\/[^/]*?\/)(.*)$/);
      if (m && m[1] !== combined) {
        pending[ipaIdx2] = m[1].replace(/\s+/g, "");
        const tail = m[2].trim();
        if (tail) {
          pending.splice(ipaIdx2 + 1, 0, tail);
        }
      } else {
        pending[ipaIdx2] = combined;
      }
    } else if (curIpa && curIpa.endsWith("/")) {
      // IPA closed. Meaning wrap.
      const meaningIdx = ipaIdx2 + 1;
      if (meaningIdx <= pending.length) {
        if (pending[meaningIdx]) {
          pending[meaningIdx] = (pending[meaningIdx] + " " + text).trim();
        } else {
          pending.push(text);
        }
      }
    }
  }
  flush();

  // Strip trailing page numbers from meanings.
  for (const t of topics) {
    for (const c of t.cards) {
      c.meaning = c.meaning.replace(/\s+\d{1,3}$/, "").trim();
    }
  }

  const total = topics.reduce((a, t) => a + t.cards.length, 0);
  console.log(`Parsed ${topics.length} topics, ${total} cards.`);
  for (const t of topics) {
    console.log(`  ${String(t.index).padStart(2)}. ${t.name} (${t.cards.length} từ)`);
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: "3000 từ vựng tiếng Anh thông dụng Oxford theo chủ đề",
        generatedAt: new Date().toISOString(),
        topics: topics.map((t) => ({
          index: t.index,
          name: t.name,
          cards: t.cards,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`Wrote: ${OUT}`);
}

if (require.main === module) main();
