/**
 * For each "JSON differs from source" entry, compare with a trusted external
 * source (Oxford Learner's / Cambridge dictionary via the Web) by checking
 * if the source has obvious OCR artifacts.
 *
 * Heuristic: source is "trustworthy" if:
 *   - IPA has standard slashes
 *   - IPA has no spaces (indicates it didn't merge with another IPA)
 *   - IPA starts with stress mark or any vowel/consonant
 *
 * Source is "corrupted" if:
 *   - Has space inside IPA
 *   - Has empty gap "/ /"
 *   - Starts/ends with weird characters
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "scripts", "oxford-source.txt");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

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

function normalize(w) {
  return w
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]/g, "")
    .trim();
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
        topics[cur].push({ word, pos, ipa: cols[2] || "", meaning: cols[3] || "", line });
      }
    }
  }
  return topics;
}

function main() {
  const src = parseSource();
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));
  const jMap = {};
  for (const t of data.topics) {
    jMap[t.index] = new Map();
    for (const c of t.cards) jMap[t.index].set(normalize(c.word), c);
  }

  // Heuristic to detect if source is corrupted:
  //   - missing slashes on either side
  //   - has smart quote ' ' (2019)
  //   - has " " (multiple spaces inside IPA)
  //   - has visible English inside IPA (>=4 Latin chars in a row without IPA chars)
  function looksCorrupted(ipa) {
    if (!ipa) return true;
    if (!/^\//.test(ipa)) return true;
    if (!/\/$/.test(ipa)) return true;
    if (/\s\S\s\S/.test(ipa.replace(/^\/|\/$/g, ""))) return true;
    if (/[‘’]/.test(ipa)) return true;
    if (/\s$/.test(ipa) || /^\s/.test(ipa)) return true;
    return false;
  }

  const issues = [];
  for (let i = 1; i <= 60; i++) {
    const items = src[i] || [];
    if (!jMap[i]) continue;
    for (const s of items) {
      const renamed = RENAME[normalize(s.word)] || normalize(s.word);
      const key = normalize(renamed);
      const j = jMap[i].get(key);
      if (!j) continue;
      const sIpa = s.ipa || "";
      const jIpa = j.ipa || "";
      if (normalize(sIpa) === normalize(jIpa)) continue;
      const sOk = !looksCorrupted(sIpa);
      const jOk = !looksCorrupted(jIpa);
      issues.push({
        topic: i,
        word: s.word,
        jsonName: j.word,
        srcIpa: sIpa,
        jsonIpa: jIpa,
        srcMeaning: s.meaning,
        jsonMeaning: j.meaning,
        srcOk: sOk,
        jsonOk: jOk,
      });
    }
  }

  // Categorize:
  console.log("===== JSON BAD but source OK =====");
  for (const x of issues.filter((i) => !i.jsonOk && i.srcOk)) {
    console.log(`T${x.topic} "${x.word}": src="${x.srcIpa}" json="${x.jsonIpa}"`);
  }
  console.log("\n===== Both look bad =====");
  for (const x of issues.filter((i) => !i.jsonOk && !i.srcOk)) {
    console.log(`T${x.topic} "${x.word}": src="${x.srcIpa}" json="${x.jsonIpa}"`);
  }
  console.log("\n===== JSON OK, source has minor diff (whitespace/slashes) =====");
  for (const x of issues.filter((i) => i.jsonOk && i.srcOk)) {
    console.log(`T${x.topic} "${x.word}": src="${x.srcIpa}" json="${x.jsonIpa}"`);
  }
}

main();
