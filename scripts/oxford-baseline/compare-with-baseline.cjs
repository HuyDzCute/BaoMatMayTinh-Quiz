// Compare data in oxford-3000-source.json with Oxford 3000 official list
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

const topics = data.topics;
const allCards = [];
for (const t of topics) {
  for (const c of t.cards) {
    allCards.push({ ...c, topicIndex: t.index, topicName: t.name });
  }
}

console.log("Baseline (Oxford 3000 official):", baseline.length, "unique words");
console.log("Total topics: ", topics.length);
console.log("Total cards: ", allCards.length);

// Normalize word for comparison
function normalizeWord(w) {
  return w
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .replace(/[^\w\s'-]/g, "");
}

// Build a set of all words in JSON
const jsonWords = allCards.map((d) => ({
  raw: d.word,
  norm: normalizeWord(d.word),
  topic: d.topicIndex,
  topicName: d.topicName,
  ipa: d.ipa,
  meaning: d.meaning,
}));

const jsonSet = new Set(jsonWords.map((j) => j.norm));

// 1. Words in JSON that are NOT in baseline
const notInBaseline = jsonWords.filter((j) => !baselineSet.has(j.norm));
console.log("\n=== Words in JSON NOT in Oxford 3000 baseline ===");
console.log("Count:", notInBaseline.length);
if (notInBaseline.length) {
  // Group by topic
  const byTopic = {};
  for (const w of notInBaseline) {
    const t = w.topicName || "unknown";
    if (!byTopic[t]) byTopic[t] = [];
    byTopic[t].push(w);
  }
  for (const [t, ws] of Object.entries(byTopic)) {
    console.log(`\n--- Topic ${t} (${ws.length}) ---`);
    ws.forEach((w) => console.log(`  - ${w.raw} | ${w.ipa} | ${w.meaning}`));
  }
}

// 2. Words in baseline that are NOT in JSON
const missingFromData = baseline.filter((w) => !jsonSet.has(w));
console.log("\n=== Words in Oxford 3000 baseline NOT in JSON ===");
console.log("Count:", missingFromData.length);
if (missingFromData.length) {
  // Save to file for later processing
  fs.writeFileSync(path.join(__dirname, "missing-words.txt"), missingFromData.join("\n") + "\n");
  for (const w of missingFromData) console.log(`  - ${w}`);
}

// 3. Multi-word phrases
const multiword = jsonWords.filter((j) => j.norm.includes(" "));
console.log("\n=== Multi-word phrases in JSON ===");
console.log("Count:", multiword.length);
multiword.forEach((w) => console.log(`  - ${w.raw} | ${w.ipa} | ${w.meaning} (in ${w.topicName})`));
