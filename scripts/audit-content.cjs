const fs = require("fs");
const t = fs.readFileSync("lib/flashcards-paraphrasing.ts", "utf8");

// Extract all cards
const cards = [
  ...t.matchAll(
    /\{ id: "([^"]+)", front: "((?:[^"\\]|\\.)*)", back: "((?:[^"\\]|\\.)*)", pronunciation: "([^"]*)", example: "((?:[^"\\]|\\.)*)"(?:, pronunciation: "([^"]*)", example: "((?:[^"\\]|\\.)*)")? \}/g,
  ),
];

console.log("Total cards parsed:", cards.length);

// Better: parse by topic
const topics = ["city", "crime", "edu", "env", "fam", "health", "tour", "trans", "work"];
const topicNames = {
  city: "City Life",
  crime: "Crime",
  edu: "Education",
  env: "Environment",
  fam: "Family & Children",
  health: "Health",
  tour: "Tourism",
  trans: "Transport",
  work: "Work",
};

const stats = {};
topics.forEach((t) => (stats[t] = { vocab: 0, para: 0, idiom: 0, example: 0 }));

// Just parse by id pattern
const idList = [...t.matchAll(/id: "(vocab|para|idiom|example)-([a-z0-9-]+)-(\d+)"/g)];
console.log("\n=== Card breakdown by prefix ===");
const prefixMap = {};
idList.forEach(([_, prefix, topic, num]) => {
  const key = `${prefix} (${topic})`;
  prefixMap[key] = (prefixMap[key] || 0) + 1;
});
Object.entries(prefixMap)
  .sort()
  .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Now check for content issues
console.log("\n=== Checking for Vietnamese/English mismatches ===");
// Look for suspicious patterns
const cardEntries = [
  ...t.matchAll(/\{ id: "([^"]+)", front: "((?:[^"\\]|\\.)*)", back: "((?:[^"\\]|\\.)*)"/g),
];
let suspicious = [];
cardEntries.forEach(([_, id, front, back]) => {
  const f = front.replace(/\\"/g, '"');
  const b = back.replace(/\\"/g, '"');
  // The back is Vietnamese usually. Check if back has unescaped apostrophes (')
  if (b.includes("'") && !b.includes("''")) {
    // ok
  }
  // Check for typos like "việc" missing diacritics - explicit
  if (b !== b.trim()) {
    suspicious.push({ id, issue: "back has leading/trailing whitespace" });
  }
  // Check for Vietnamese diacritics
  if (!/[\u00C0-\u1EF9]/.test(b)) {
    suspicious.push({ id, issue: "back has NO Vietnamese diacritics", back: b });
  }
});
console.log("Suspicious (no diacritics in VN):", suspicious.length);
suspicious.slice(0, 20).forEach((s) => console.log("  ", s.id, ":", s.back));
