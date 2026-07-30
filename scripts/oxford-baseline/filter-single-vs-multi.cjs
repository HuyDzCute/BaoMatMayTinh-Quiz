// Find single-word entries NOT in Oxford 3000 baseline
const fs = require("fs");
const path = require("path");

const baseline = fs
  .readFileSync(path.join(__dirname, "official-3000.txt"), "utf8")
  .split("\n")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

const baselineSet = new Set(baseline);

const JSON_PATH = path.join(__dirname, "..", "..", "lib", "oxford-3000-source.json");
const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

const allCards = [];
for (const t of data.topics) {
  for (const c of t.cards) {
    allCards.push({ ...c, topicIndex: t.index, topicName: t.name });
  }
}

function normalizeWord(w) {
  return w
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .replace(/[^\w\s'-]/g, "");
}

// Single-word entries not in baseline
const singleWordNotInBaseline = [];
const multiwordInJson = [];
for (const c of allCards) {
  const norm = normalizeWord(c.word);
  if (norm.includes(" ")) {
    multiwordInJson.push(c);
    continue;
  }
  if (!baselineSet.has(norm)) {
    singleWordNotInBaseline.push(c);
  }
}

console.log("=== Single-word entries in JSON NOT in Oxford 3000 baseline ===");
console.log("Count:", singleWordNotInBaseline.length);

// Group by topic
const byTopic = {};
for (const c of singleWordNotInBaseline) {
  const t = c.topicName;
  if (!byTopic[t]) byTopic[t] = [];
  byTopic[t].push(c);
}
for (const [t, cards] of Object.entries(byTopic)) {
  console.log(`\n--- ${t} (${cards.length}) ---`);
  for (const c of cards) {
    console.log(`  - ${c.word} | ${c.ipa} | ${c.meaning}`);
  }
}

console.log("\n=== Multi-word phrases in JSON ===");
console.log("Count:", multiwordInJson.length);
for (const c of multiwordInJson) {
  console.log(`  - ${c.word} | ${c.ipa} | ${c.meaning} (in ${c.topicName})`);
}

// Save outputs
fs.writeFileSync(
  path.join(__dirname, "single-word-missing.txt"),
  singleWordNotInBaseline
    .map((c) => `${c.word}\t${c.ipa}\t${c.meaning}\t${c.topicName}`)
    .join("\n") + "\n",
);
fs.writeFileSync(
  path.join(__dirname, "multi-word-list.txt"),
  multiwordInJson.map((c) => `${c.word}\t${c.ipa}\t${c.meaning}\t${c.topicName}`).join("\n") + "\n",
);

console.log("\nFiles saved: single-word-missing.txt, multi-word-list.txt");
