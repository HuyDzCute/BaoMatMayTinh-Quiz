/**
 * DEEP AUDIT — compares each source entry against JSON entry.
 *
 * Strategy: read source line by line, extract (word, pos, ipa, meaning).
 * For each source entry, find the closest JSON entry by normalized word.
 * Compare pos/ipa/meaning for discrepancies.
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
  // Continuation: lines without a tab that follow a tab-bearing row
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
      if (cols.length >= 2) {
        // First cell is "word pos"
        const firstCell = cols[0].trim();
        // Split into word and trailing pos
        const m2 = firstCell.match(
          /^(.+?)\s+(v\.?\s*phr|n\.?\s*phr|phrasal\s+v|adj|n|v|adv|pre|prep)$/i,
        );
        let word, pos;
        if (m2) {
          word = m2[1].trim();
          pos = m2[2].trim().replace(/\s+/g, " ");
          // Normalize pos
          pos = pos
            .toLowerCase()
            .replace(/\./g, "")
            .replace(/phrasalv/g, "phrasal v")
            .replace(/\bphr\b/, "phr")
            .trim();
          // re-normalize variants
          const posMap = {
            "v phr": "v. phr",
            "n phr": "n. phr",
            "phrasal v": "phrasal v",
          };
          pos = posMap[pos] || pos;
        } else {
          word = firstCell;
          pos = "";
        }
        const ipa = (cols[2] || "").trim();
        const meaning = (cols[3] || "").trim();
        topics[cur].push({
          topic: cur,
          word,
          posRaw: pos,
          ipaRaw: ipa,
          meaningRaw: meaning,
          line,
        });
      }
    }
  }
  return topics;
}

function getJsonKey(jsonData) {
  // Build a map: topic -> Map<normalized word, entry>
  const m = {};
  for (const t of jsonData.topics) {
    m[t.index] = new Map();
    for (const c of t.cards) {
      const key = normalize(c.word);
      m[t.index].set(key, c);
    }
  }
  return m;
}

function main() {
  const src = parseSource();
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));
  const jsonByTopic = getJsonKey(data);

  const report = {
    missing: [],
    ipaMismatch: [],
    meaningMismatch: [],
    posMismatch: [],
    nameMismatch: [],
  };

  for (let i = 1; i <= 60; i++) {
    const srcItems = src[i] || [];
    const jMap = jsonByTopic[i];
    if (!jMap) continue;
    for (const s of srcItems) {
      // Determine canonical key after rename
      const normSrc = normalize(s.word);
      const renamed = RENAME[normSrc] || normSrc;
      const key = normalize(renamed);
      const jEntry = jMap.get(key);
      if (!jEntry) {
        report.missing.push({ topic: i, src: s });
        continue;
      }
      // Compare pos
      const jPos = (jEntry.pos || "").toLowerCase().replace(/\s+/g, " ").trim();
      const sPos = (s.posRaw || "").toLowerCase().replace(/\s+/g, " ").trim();
      // Allow some flexibility: missing pos in source is OK
      if (sPos && jPos && sPos !== jPos && !(sPos.includes(jPos) || jPos.includes(sPos))) {
        // Accept some variations: "phrasal v" same
        const sN = sPos.replace(/v\.?/g, "v").replace(/n\.?/g, "n").replace(/\s+/g, " ");
        const jN = jPos.replace(/v\.?/g, "v").replace(/n\.?/g, "n").replace(/\s+/g, " ");
        if (sN !== jN) {
          report.posMismatch.push({
            topic: i,
            src: s,
            json: jEntry,
          });
        }
      }
      // Compare IPA - basic only; smart quote replaced
      const sIpa = (s.ipaRaw || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
      const jIpa = (jEntry.ipa || "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
      if (sIpa && jIpa && sIpa !== jIpa) {
        // Smart quote differs by case
        // ' vs ˈ — note these are different characters
        report.ipaMismatch.push({
          topic: i,
          word: s.word,
          srcIpa: s.ipaRaw,
          jsonIpa: jEntry.ipa,
        });
      }
      // Compare meaning
      const sMean = (s.meaningRaw || "").trim();
      const jMean = (jEntry.meaning || "").trim();
      if (sMean && jMean && sMean !== jMean) {
        report.meaningMismatch.push({
          topic: i,
          word: s.word,
          srcMeaning: sMean,
          jsonMeaning: jMean,
        });
      }
      // Compare names (after rename)
      const jName = normalize(jEntry.word);
      if (jName !== key) {
        report.nameMismatch.push({
          topic: i,
          src: s.word,
          jsonName: jEntry.word,
        });
      }
    }
  }

  console.log("===== DEEP AUDIT REPORT =====");
  console.log("Missing (in source but not JSON):", report.missing.length);
  for (const x of report.missing) {
    console.log(`  T${x.topic}: ${JSON.stringify(x.src.word)} | ${JSON.stringify(x.src.line)}`);
  }
  console.log("");
  console.log("POS mismatches:", report.posMismatch.length);
  for (const x of report.posMismatch) {
    console.log(`  T${x.topic}: "${x.src.word}" | src=${x.src.posRaw} json=${x.json.pos}`);
  }
  console.log("");
  console.log("IPA mismatches:", report.ipaMismatch.length);
  for (const x of report.ipaMismatch) {
    console.log(
      `  T${x.topic}: "${x.word}" | src=${JSON.stringify(x.srcIpa)} json=${JSON.stringify(x.jsonIpa)}`,
    );
  }
  console.log("");
  console.log("Meaning mismatches:", report.meaningMismatch.length);
  for (const x of report.meaningMismatch) {
    console.log(
      `  T${x.topic}: "${x.word}" | src=${JSON.stringify(x.srcMeaning)} json=${JSON.stringify(x.jsonMeaning)}`,
    );
  }
  console.log("");
  console.log("Name mismatches (after rename):", report.nameMismatch.length);
  for (const x of report.nameMismatch) {
    console.log(`  T${x.topic}: src=${JSON.stringify(x.src)} json=${JSON.stringify(x.jsonName)}`);
  }
}

main();
