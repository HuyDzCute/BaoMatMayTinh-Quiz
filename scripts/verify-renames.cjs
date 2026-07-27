/**
 * Confirm that all "missing" entries have a renamed equivalent in JSON.
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "scripts", "oxford-source.txt");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

function extractWord(raw) {
  let w = raw.trim();
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

  // All known renames (font artifact: f dropped, or merged entry)
  const RENAME = {
    Jellysh: "Jellyfish",
    Shellsh: "Shellfish",
    Starsh: "Starfish",
    "Co ee maker": "Coffee maker",
    Suer: "Suffer",
    "Bu alo": "Buffalo",
    Cli: "Cliff",
    "Switch o": "Switch off",
    "Take o": "Take off",
    "Con scate": "Confiscate",
    Snile: "Sniff",
    "Fever virus": "Viral fever",
    "Rice Paddy": "Rice paddy herb",
    "Tra c": "Traffic",
    "Speeding ne": "Speeding fine",
    "Sel sh": "Selfish",
    "Con dent": "Confident",
    "Co ee": "Coffee",
    "Action lm": "Action film",
    "Silent lm": "Silent film",
    "Kick o": "Kick off",
    Oside: "Offside",
    "Mid elder": "Midfielder",
    "Quali cation": "Qualification",
    "Gira e": "Giraffe",
    Cutlesh: "Cuttlefish",
    "Re nery": "Refinery",
    "Police o cer": "Police officer",
    "Keep- t": "Keep-fit",
    "Forest re": "Forest fire",
    "Booking o ce": "Booking office",
    Sta: "Staff",
    "Sta movements": "Staff movements",
    "Back-o ce": "Back-office",
    Save: "Save as",
    "Turn o": "Turn off",
    out: "Take the rubbish out",
  };

  let orphans = 0;
  for (let i = 1; i <= 60; i++) {
    const srcItems = src[i] || [];
    const t = data.topics.find((t) => t.index === i);
    if (!t) continue;
    const jsonWords = new Set(t.cards.map((c) => c.word.toLowerCase().replace(/\s+/g, " ").trim()));
    const missing = srcItems.filter(
      (it) => !jsonWords.has(it.word.toLowerCase().replace(/\s+/g, " ").trim()),
    );
    for (const m of missing) {
      const renamed = RENAME[m.word];
      if (renamed) {
        const inJson = jsonWords.has(renamed.toLowerCase().replace(/\s+/g, " ").trim());
        if (inJson) {
          console.log(`OK T${i}: "${m.word}" → "${renamed}" ✓`);
        } else {
          console.log(`!!! T${i}: "${m.word}" should be "${renamed}" but NOT in JSON`);
          orphans++;
        }
      } else {
        console.log(`??? T${i}: "${m.word}" has no rename mapping`);
        orphans++;
      }
    }
  }
  console.log(`\nOrphans: ${orphans}`);
}

main();
