/**
 * Find truly missing entries: extract canonical word from source
 * (strip pos suffix like "v. phr", strip trailing whitespace), then
 * compare normalized forms against JSON.
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "scripts", "oxford-source.txt");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

function extractWord(raw) {
  // 'raw' is the first tab-separated cell or start of line.
  // strip leading/trailing whitespace
  let w = raw.trim();
  // strip trailing pos tokens like "v. phr", "n. phr", "v", "n", "adj", "phrasal v"
  // but only if the pos is at the end of a multi-word phrase
  // heuristic: remove trailing " <pos>" if <pos> is known
  const POS_RE = / (?:v|adj|n|adv|pre)\.?(?: phr)?$/;
  w = w.replace(POS_RE, "").trim();
  return w;
}

function parseSource() {
  const raw = fs.readFileSync(SRC, "utf8");
  const lines = raw.split(/\r?\n/);
  let cur = null;
  const topics = {};
  const tableHeader = /^Từ vựng\s+Từ loại\s+Phiên âm/;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(\d+)\.\s+Từ vựng/);
    if (m) {
      cur = parseInt(m[1], 10);
      topics[cur] = [];
      continue;
    }
    if (tableHeader.test(t)) continue;
    if (cur && t.includes("\t")) {
      const cols = t.split("\t");
      if (cols.length >= 2) {
        const word = extractWord(cols[0]);
        if (word) topics[cur].push({ word, line });
      }
    }
  }
  return topics;
}

function main() {
  const src = parseSource();
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));

  let totalMissing = 0;
  for (let i = 1; i <= 60; i++) {
    const srcItems = src[i] || [];
    const t = data.topics.find((t) => t.index === i);
    if (!t) continue;
    const jsonWords = new Set(t.cards.map((c) => c.word.toLowerCase().replace(/\s+/g, " ").trim()));
    const missing = srcItems.filter(
      (it) => !jsonWords.has(it.word.toLowerCase().replace(/\s+/g, " ").trim()),
    );
    if (missing.length) {
      console.log(`T${i} (${t.name}): missing ${missing.length}`);
      for (const m of missing) {
        console.log(`  - ${JSON.stringify(m.word)}`);
      }
      totalMissing += missing.length;
    }
  }
  console.log(`\nTotal truly missing: ${totalMissing}`);
}

main();
