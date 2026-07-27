/**
 * Extract structured text from the Oxford 3000 PDF using pdfjs-dist.
 *
 * pdfjs gives us per-text-item { str, transform: [a,b,c,d,x,y], width, height }
 * which lets us rebuild columns by x-coordinate and detect rows by y.
 *
 * Output: lib/oxford-3000-source.json
 */
const fs = require("fs");
const path = require("path");

(async () => {
  const PDF_PATH =
    process.env.PDF_PATH ||
    "C:\\Users\\Administrator\\Downloads\\3000-tu-vung-tieng-anh-thong-dung-oxford-theo-chu-de.pdf";
  const OUT_PATH = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

  // pdfjs-dist v4: legacy build for Node
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const loadingTask = pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;
  console.log(`Loaded ${pdf.numPages} pages.`);

  /**
   * For each page, collect text items with positions. Then cluster items into
   * "lines" by Y, and within each line sort by X.
   */
  async function clusterPage(page) {
    const items = [];
    const text = await page.getTextContent();
    let prevY = null;
    const lines = [];
    let curLine = [];
    for (const it of text.items) {
      const t = it.transform; // [a,b,c,d,e,f]
      const x = t[4];
      const y = t[5];
      const str = it.str;
      if (!str) continue;
      if (prevY === null || Math.abs(y - prevY) > 3) {
        if (curLine.length) lines.push(curLine);
        curLine = [];
      }
      curLine.push({ x, y, str, width: it.width, height: it.height });
      prevY = y;
    }
    if (curLine.length) lines.push(curLine);

    // Within each line, sort by x ascending and join with appropriate spacing.
    const rows = [];
    for (const ln of lines) {
      ln.sort((a, b) => a.x - b.x);
      // join items with 1 space; if gap > 8px, add 2 spaces (column separator)
      let s = "";
      let prevEnd = null;
      for (const it of ln) {
        if (prevEnd !== null) {
          const gap = it.x - prevEnd;
          s += gap > 18 ? "  " : gap > 8 ? " " : "";
        }
        s += it.str;
        prevEnd = it.x + (it.width || 0);
      }
      s = s.replace(/\s+$/g, "");
      if (s.trim()) rows.push({ y: ln[0].y, text: s });
    }
    return rows;
  }

  const allRows = []; // [{page, y, text}]
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const rows = await clusterPage(page);
    for (const r of rows) allRows.push({ page: p, y: r.y, text: r.text });
  }
  console.log(`Got ${allRows.length} rows.`);

  // Write raw extracted rows for debugging
  fs.writeFileSync(
    path.resolve(__dirname, "oxford-rows.txt"),
    allRows.map((r) => `[p${r.page}] ${r.text}`).join("\n"),
    "utf8",
  );

  // ── Parse structure ──────────────────────────────────────────────────
  const TOPIC_RE = /^\s*(\d+)\.\s*(.+)$/;
  const TABLE_HEAD_RE = /^Từ vựng\s+Từ loại\s+Phiên âm\s+Ý nghĩa\s*$/;

  const POS_RE =
    /^(n|v|adj|adv|pre|phrasal v|n\. phr|v\. phr|adj\/v|adj\/n|n\/adj|pre\/v|adj\/n|v\/n|pre\/adv)$/i;

  function parseRow(text) {
    // Split into 2+ space tokens
    const parts = text
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 3) return null;

    let word, pos, ipa, meaning;
    if (POS_RE.test(parts[1] || "")) {
      word = parts[0];
      pos = parts[1];
      ipa = parts[2];
      meaning = parts.slice(3).join(" ");
    } else {
      // Multi-word entry: "Brush your teeth", pos, ipa, meaning
      const posIdx = parts.findIndex((p) => POS_RE.test(p));
      if (posIdx < 1) return null;
      word = parts.slice(0, posIdx).join(" ");
      pos = parts[posIdx];
      ipa = parts[posIdx + 1];
      if (!ipa) return null;
      meaning = parts.slice(posIdx + 2).join(" ");
    }
    if (!word || !pos || !ipa) return null;
    ipa = ipa.replace(/\s+/g, "");
    return { word, pos, ipa, meaning: meaning || "" };
  }

  const topics = [];
  let cur = null;
  let afterHeader = false;

  for (const row of allRows) {
    const t = row.text;
    if (!t.trim()) continue;

    // Topic heading like "1. Từ vựng về đồ dùng học tập"
    const topicMatch = t.match(TOPIC_RE);
    if (topicMatch && /^Từ vựng/.test(t)) {
      if (cur) topics.push(cur);
      cur = {
        index: parseInt(topicMatch[1], 10),
        name: topicMatch[2].trim(),
        cards: [],
      };
      afterHeader = false;
      continue;
    }

    // Footer page markers like "-- 3 of 107 --"
    if (/^--\s+\d+\s+of\s+\d+\s+--\s*$/.test(t)) continue;

    // Page numbers alone on a line (skip)
    if (/^\d{1,3}$/.test(t.trim())) continue;

    if (!cur) continue;

    // Table header after topic
    if (TABLE_HEAD_RE.test(t)) {
      afterHeader = true;
      continue;
    }

    if (!afterHeader) continue;

    const parsed = parseRow(t);
    if (parsed) {
      cur.cards.push(parsed);
    } else {
      // Could be a wrapped meaning word. Append to last card if it looks like continuation
      const last = cur.cards[cur.cards.length - 1];
      if (last && t.trim().length < 60 && !/^\d+\./.test(t.trim())) {
        // Only append if it's a single short word (likely wrapped syllable/word)
        if (!POS_RE.test(t.trim().split(/\s+/)[0] || "")) {
          last.meaning = (last.meaning + " " + t.trim()).trim();
        }
      }
    }
  }
  if (cur) topics.push(cur);

  // Cleanup: trim stray trailing numbers from meanings
  for (const t of topics) {
    for (const c of t.cards) {
      c.meaning = c.meaning.replace(/\s+\d{1,3}$/, "").trim();
    }
  }

  const totalCards = topics.reduce((a, t) => a + t.cards.length, 0);
  console.log(`Parsed ${topics.length} topics, ${totalCards} cards.`);
  for (const t of topics) {
    console.log(`  ${String(t.index).padStart(2)}. ${t.name} (${t.cards.length} từ)`);
  }

  fs.writeFileSync(
    OUT_PATH,
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
  console.log(`Wrote: ${OUT_PATH}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
