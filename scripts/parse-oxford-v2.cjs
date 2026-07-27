/**
 * Parse the Oxford 3000 source text into a clean JSON dataset.
 *
 * The source (`scripts/oxford-source.txt`) is a tab-separated table:
 *   <word>\t<pos>\t<ipa>\t<meaning>
 *
 * Some rows are corrupted by the PDF renderer:
 *
 *  1. POS column has a stray IPA block glued on.
 *     "Magnifying Glass\tn. phr /ˈmæɡ.nɪ.faɪ.ɪŋ"
 *     → split into ["Magnifying Glass","n. phr","/ˈmæɡ.nɪ.faɪ.ɪŋ"]
 *     The IPA continues on the next physical line (multi-line IPA).
 *
 *  2. IPA cell contains both IPA and meaning.
 *     "Pencil Sharpener\tn. phr\t/ˈpen.səl ˌʃɑː.pən.ər/ Đồ gọt bút chì"
 *     → split into ["/ˈpen.səl ˌʃɑː.pən.ər/", "Đồ gọt bút chì"]
 *
 *  3. IPA missing leading slash.
 *     "Clamp\tn\tklæmp/\tKẹp"
 *     → "Clamp\tn\t/klæmp/\tKẹp"
 *
 *  4. Multi-line IPA continuation (no tab, IPA chars only).
 *     "Magnifying Glass\tn. phr /ˈmæɡ.nɪ.faɪ.ɪŋ"
 *     "ˌɡlɑːs/ Kính lúp"
 *     → assemble the full row:
 *       "Magnifying Glass\tn. phr\t/ˈmæɡ.nɪ.faɪ.ɪŋ ˌɡlɑːs/\tKính lúp"
 *
 *  5. Multi-line meaning continuation (no tab, Vietnamese only).
 *     "Bacon\tn\t/ˈbeɪ.kən/ Thịt ba rọi xông"
 *     "khói"
 *     → "Bacon\tn\t/ˈbeɪ.kən/\tThịt ba rọi xông khói"
 *
 * This parser handles all five cases by first normalising the raw lines
 * into clean 4-column rows, then emitting structured JSON.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "oxford-source.txt");
const OUT = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

const POS_RE =
  /^(n|v|adj|adv|pre|phrasal\s+v|n\.\s*phr|v\.\s*phr|adj\/v|adj\/n|n\/adj|pre\/v|adj\/n|v\/n|pre\/adv)$/i;

const TOPIC_RE = /^(\d+)\.\s*(.+)$/;

const IPA_LIKE =
  /^[\sA-Za-zəɪʊɔæœɐɒɛɜɪʊʌɒɔəɛæœɤʌ\.\u02C8\u02CC\u0303\u0302\u0301\u0300\u0304ː'ˌˈ]+$/;

function hasViet(s) {
  return /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/.test(s);
}

/** Strip the leading slash if missing and a closing slash is present. */
function normalizeIpa(s) {
  s = (s || "").trim();
  if (!s) return s;
  if (!s.startsWith("/") && s.endsWith("/") && IPA_LIKE.test(s.slice(0, -1))) {
    return "/" + s;
  }
  return s;
}

/** Extract the first "/.../" block from a string. Returns null if the
 *  string doesn't start with a "/" OR has no closing "/".
 */
function firstIpaBlock(s) {
  if (!s || !s.startsWith("/")) return null;
  const m = s.match(/^(\/[^\/\n]*?\/)(.*)$/s);
  if (!m) return null;
  return { ipa: m[1], tail: m[2] };
}

/** Phase 1: normalize raw lines into 4-column rows.
 *
 *  Input: array of raw text lines (may include blank lines).
 *  Output: array of normalised lines, each in the form
 *    <word>\t<pos>\t<ipa>\t<meaning>
 *  plus topic headers unchanged.
 *
 *  Algorithm:
 *    - If a line starts with `\d+.` and matches a topic header, emit it.
 *    - If a line is "Từ vựng<TAB>Từ loại<TAB>Phiên âm<TAB>Ý nghĩa", skip.
 *    - If a line has at least one tab, split by tabs:
 *        - If POS column has a stray "/..." glued on, split into two cells.
 *        - If IPA cell starts with "/" and has no closing "/", pull
 *          continuation lines until we find a closing "/" (multi-line IPA).
 *        - If IPA cell ends with "/" but lacks a leading "/", add it.
 *        - If IPA cell has "/.../<vietnamese>" (merged IPA+meaning), split.
 *    - If a line has no tab but the previous row has an unclosed IPA, the
 *      line is a continuation. Append IPA chars to the IPA cell, and any
 *      Vietnamese chars to the meaning cell.
 */
function normalize(rawLines) {
  const out = [];
  let pending = null; // current row being assembled

  function commit() {
    if (pending) {
      out.push(pending.join("\t"));
      pending = null;
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const line = raw.replace(/\s+$/g, "");
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Topic header.
    if (TOPIC_RE.test(trimmed) && /Từ vựng\s+về/i.test(trimmed)) {
      commit();
      out.push(trimmed);
      pending = null;
      continue;
    }

    // Table header.
    if (/^Từ vựng\s+Từ loại\s+Phiên âm\s+Ý nghĩa\s*$/.test(trimmed)) {
      continue;
    }

    if (line.includes("\t")) {
      // Try to parse as a row.
      let parts = line.split("\t").map((s) => s.trim());

      // Identify POS column.
      let posIdx = parts.findIndex((p) => POS_RE.test(p));

      // Sub-case: POS column has a stray IPA chunk.
      if (posIdx < 0) {
        for (let j = 1; j < parts.length; j++) {
          const m = parts[j].match(
            /^([nv](?:\.\s*phr)?|adj|adv|pre|phrasal\s+v|adj\/v|adj\/n|n\/adj|pre\/v|adj\/n|v\/n|pre\/adv)\s+(\/[^\/\n]*)$/,
          );
          if (m) {
            parts = [...parts.slice(0, j), m[1].trim(), m[2], ...parts.slice(j + 1)];
            posIdx = j;
            break;
          }
        }
        if (posIdx < 0) {
          // Couldn't identify POS — skip this line.
          continue;
        }
      }

      const ipaIdx = posIdx + 1;
      let ipaCell = parts[ipaIdx] || "";

      // Sub-case: IPA missing leading slash but has closing.
      ipaCell = normalizeIpa(ipaCell);

      // Sub-case: IPA cell has merged IPA + meaning.
      const split = firstIpaBlock(ipaCell);
      if (split) {
        ipaCell = split.ipa.replace(/\s+/g, "");
        const tail = split.tail.trim();
        if (tail) {
          if (hasViet(tail) || /^[A-Z]/.test(tail)) {
            // The tail contains meaning — splice after IPA column.
            parts = [...parts.slice(0, ipaIdx), ipaCell, tail, ...parts.slice(ipaIdx + 1)];
          } else if (tail.startsWith("/")) {
            // Tail is more IPA — push as continuation for next-line wrap.
            parts[ipaIdx] = ipaCell;
            // Defer to continuation handling.
            commit();
            pending = parts.slice(0, ipaIdx + 1).concat(parts.slice(ipaIdx + 1));
            pending.push("__CONTINUATION__" + tail);
            continue;
          }
        } else {
          parts[ipaIdx] = ipaCell;
        }
      } else {
        parts[ipaIdx] = ipaCell;
      }

      // Sub-case: IPA still unclosed (no closing "/"). Pull continuations.
      if (!ipaCell.endsWith("/")) {
        // The IPA might be incomplete. Collect continuation lines until
        // we find a closing "/".
        let collected = ipaCell;
        let consumed = 0;
        let vietTail = "";
        for (let j = i + 1; j < rawLines.length; j++) {
          const next = rawLines[j];
          if (!next.trim()) continue;
          if (next.includes("\t")) {
            // Hit another tab-separated row before closing IPA. Treat as-is.
            break;
          }
          consumed++;
          const nextTrim = next.trim();
          collected += " " + nextTrim;
          // Check if there's a closing slash anywhere in the collected text.
          const closeMatch = collected.match(/^([^\/]*?\/[^/]*?\/)(.*)$/s);
          if (closeMatch && closeMatch[1].includes("/")) {
            // Closing slash found. ipa = closeMatch[1], tail = closeMatch[2].
            parts[ipaIdx] = closeMatch[1].replace(/\s+/g, "");
            vietTail = closeMatch[2].trim();
            break;
          }
          // If we've eaten more than 4 continuation lines without finding a
          // closing slash, give up.
          if (consumed > 4) break;
        }
        if (vietTail) {
          parts = [...parts.slice(0, ipaIdx + 1), vietTail, ...parts.slice(ipaIdx + 1)];
        }
        i += consumed;
      }

      // Drop any trailing empty cells (parser may have left blanks).
      while (parts.length > ipaIdx + 1 && !parts[parts.length - 1]) parts.pop();

      commit();
      pending = parts;
      continue;
    }

    // No tab → continuation of previous row.
    if (pending) {
      const text = trimmed;
      // If the previous row has an unclosed IPA, this line continues it.
      const ipaIdx = pending.findIndex((p) => POS_RE.test(p)) + 1;
      if (ipaIdx > 0 && ipaIdx < pending.length) {
        const curIpa = pending[ipaIdx];
        if (curIpa && !curIpa.endsWith("/")) {
          // Append IPA chunk.
          pending[ipaIdx] = curIpa + text;
        } else if (curIpa && curIpa.endsWith("/")) {
          // Previous IPA closed. This is a meaning wrap.
          const meaningIdx = ipaIdx + 1;
          if (meaningIdx <= pending.length) {
            if (pending[meaningIdx]) {
              pending[meaningIdx] += " " + text;
            } else {
              pending.push(text);
            }
          }
        }
      }
      continue;
    }

    // Topic header (no tab).
    if (!line.includes("\t") && TOPIC_RE.test(trimmed) && /Từ vựng\s+về/i.test(trimmed)) {
      commit();
      out.push(trimmed);
      pending = null;
      continue;
    }

    // Standalone text — drop.
  }

  commit();
  return out;
}

function parseRows(normalised) {
  const topics = [];
  let cur = null;

  for (const line of normalised) {
    const tm = line.match(TOPIC_RE);
    if (tm && /Từ vựng\s+về/i.test(line)) {
      if (cur) topics.push(cur);
      cur = { index: parseInt(tm[1], 10), name: tm[2].trim(), cards: [] };
      continue;
    }
    if (!cur) continue;
    if (!line.includes("\t")) continue;

    const parts = line
      .split("\t")
      .map((s) => s.trim())
      .filter(Boolean);
    const posIdx = parts.findIndex((p) => POS_RE.test(p));
    if (posIdx < 1) continue;
    const word = parts.slice(0, posIdx).join(" ");
    const pos = parts[posIdx];
    const ipa = (parts[posIdx + 1] || "").replace(/\s+/g, "");
    const meaning = parts
      .slice(posIdx + 2)
      .join(" ")
      .trim();
    if (!word || !pos || !ipa) continue;
    cur.cards.push({ word, pos, ipa, meaning });
  }
  if (cur) topics.push(cur);
  return topics;
}

function main() {
  const raw = fs.readFileSync(SRC, "utf8");
  const rawLines = raw.split(/\r?\n/);
  const normalised = normalize(rawLines);
  const topics = parseRows(normalised);

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

module.exports = { normalize, parseRows };
