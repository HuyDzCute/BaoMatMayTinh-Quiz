/**
 * Categorize IPA mismatches:
 *  - source has multiple IPA appended (data corruption from parser bug)
 *  - source has smart quote vs JSON has ˈ
 *  - JSON is correct (Oxford standard) vs source is wrong
 *  - missing parts in JSON vs full source
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "scripts", "oxford-source.txt");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

function normalize(w) {
  return w
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]/g, "")
    .trim();
}

const RENAME = {
  jellysh: "jellyfish",
  shellsh: "shellfish",
  starsh: "starfish",
  "co ee maker": "coffee maker",
  suer: "suffer",
  "bu alo": "buffalo",
  cli: "cliff",
  "switch o": "switch off",
  "take o": "take off",
  "con scate": "confiscate",
  snile: "sniff",
  "fever virus": "viral fever",
  "rice paddy": "rice paddy herb",
  "tra c": "traffic",
  "speeding ne": "speeding fine",
  "sel sh": "selfish",
  "con dent": "confident",
  "co ee": "coffee",
  "action lm": "action film",
  "silent lm": "silent film",
  "kick o": "kick off",
  oside: "offside",
  "mid elder": "midfielder",
  "quali cation": "qualification",
  "gira e": "giraffe",
  cutlesh: "cuttlefish",
  "re nery": "refinery",
  "police o cer": "police officer",
  "keep- t": "keep-fit",
  "forest re": "forest fire",
  "booking o ce": "booking office",
  sta: "staff",
  "sta movements": "staff movements",
  "back-o ce": "back-office",
  save: "save as",
  "turn o": "turn off",
  out: "take the rubbish out",
};

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
      const cols = t.split("\t").map((c) => c.trim());
      if (cols.length >= 4) {
        const firstCell = cols[0].trim();
        const m2 = firstCell.match(
          /^(.+?)\s+(v\.?\s*phr|n\.?\s*phr|phrasal\s+v|adj|n|v|adv|pre|prep)$/i,
        );
        let word, pos;
        if (m2) {
          word = m2[1].trim();
          pos = m2[2].trim();
        } else {
          word = firstCell;
          pos = "";
        }
        const ipa = (cols[2] || "").trim();
        const meaning = (cols[3] || "").trim();
        topics[cur].push({ word, pos, ipa, meaning, fullLine: line });
      }
    }
  }
  return topics;
}

function main() {
  const src = parseSource();
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));

  // Build per-topic json map
  const jsonByTopic = {};
  for (const t of data.topics) {
    jsonByTopic[t.index] = new Map();
    for (const c of t.cards) {
      jsonByTopic[t.index].set(normalize(c.word), c);
    }
  }

  // Check special categories
  const smartQuoteSrc = []; // source IPA contains ' (smart quote)
  const multiIpaSrc = []; // source IPA contains space (likely two merged)
  const jsonLooksOk = []; // JSON is Oxford standard, source has artifact

  for (let i = 1; i <= 60; i++) {
    const items = src[i] || [];
    const jMap = jsonByTopic[i];
    if (!jMap) continue;

    for (const s of items) {
      const renamed = RENAME[normalize(s.word)] || normalize(s.word);
      const key = normalize(renamed);
      const j = jMap.get(key);
      if (!j) continue;

      const sIpa = s.ipa || "";
      const jIpa = j.ipa || "";
      if (sIpa === jIpa) continue;

      // check for smart quote in source
      if (/‘|’/.test(sIpa)) {
        smartQuoteSrc.push({
          topic: i,
          word: s.word,
          srcIpa: sIpa,
          jsonIpa: jIpa,
          srcMeaning: s.meaning,
          jsonMeaning: j.meaning,
        });
        continue;
      }
      // check for spaces in source IPA (might be 2 IPA merged)
      if (
        /\s\S\s/.test(
          sIpa
            .replace(/^\s+|\s+$/g, "")
            .replace(/^\//, "")
            .replace(/\/$/, ""),
        )
      ) {
        multiIpaSrc.push({
          topic: i,
          word: s.word,
          srcIpa: sIpa,
          jsonIpa: jIpa,
          fullLine: s.fullLine,
        });
        continue;
      }
      // otherwise: JSON might have been "improved" manually OR is wrong
      jsonLooksOk.push({
        topic: i,
        word: s.word,
        srcIpa: sIpa,
        jsonIpa: jIpa,
        srcMeaning: s.meaning,
        jsonMeaning: j.meaning,
      });
    }
  }

  console.log("===== SMART QUOTE in source =====");
  for (const x of smartQuoteSrc) {
    console.log(
      `T${x.topic} "${x.word}" src=${JSON.stringify(x.srcIpa)} json=${JSON.stringify(x.jsonIpa)} | ${x.srcMeaning}`,
    );
  }

  console.log("\n===== MULTI-IPA in source (consecutive spaces or full IPA + meaning glue) =====");
  for (const x of multiIpaSrc) {
    console.log(
      `T${x.topic} "${x.word}" src=${JSON.stringify(x.srcIpa)} json=${JSON.stringify(x.jsonIpa)}`,
    );
    console.log(`     line: ${JSON.stringify(x.fullLine)}`);
  }

  console.log("\n===== JSON differs from source (no smart quote, no multi-space) =====");
  for (const x of jsonLooksOk) {
    console.log(
      `T${x.topic} "${x.word}" src=${JSON.stringify(x.srcIpa)} json=${JSON.stringify(x.jsonIpa)}`,
    );
  }

  console.log("\n===== SUGGESTED JSON UPDATES =====");
  // For rows where source IPA has trailing content (e.g., spaces) and JSON is the shorter
  // correct version, we don't need to change JSON.
  // For rows where source is likely OK but JSON was incorrect, mark for review.
}

main();
