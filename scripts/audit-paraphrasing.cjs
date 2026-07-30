const fs = require("fs");
const t = fs.readFileSync("lib/flashcards-paraphrasing.ts", "utf8");
const ids = [...t.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
const dups = {};
ids.forEach((id) => (dups[id] = (dups[id] || 0) + 1));
const dup = Object.entries(dups).filter(([k, v]) => v > 1);
console.log(
  "Total cards:",
  ids.length,
  "| Unique:",
  new Set(ids).size,
  "| Duplicates:",
  dup.length,
);
dup.forEach(([k, v]) => console.log("  DUP", k, "x", v));

// Find missing id format
const invalid = ids.filter((id) => !/^(vocab|para|idiom|example)-[a-z0-9-]+-\d+$/.test(id));
console.log("\nInvalid IDs:", invalid.length);
invalid.forEach((id) => console.log("  INVALID", id));

// Count per topic prefix
const topicMap = {};
ids.forEach((id) => {
  const m = id.match(/^(vocab|para|idiom|example)-([a-z0-9-]+)-/);
  if (m) {
    const topic = m[2];
    topicMap[topic] = (topicMap[topic] || 0) + 1;
  }
});
console.log("\nPer-topic counts:");
Object.entries(topicMap)
  .sort()
  .forEach(([k, v]) => console.log(" ", k + ":", v));

// Check gaps in numbering per topic/type
const buckets = {};
ids.forEach((id) => {
  const m = id.match(/^(vocab|para|idiom|example)-([a-z0-9-]+)-(\d+)$/);
  if (m) {
    const key = m[1] + "-" + m[2];
    buckets[key] = buckets[key] || [];
    buckets[key].push(+m[3]);
  }
});
console.log("\nNumbering continuity (gaps):");
Object.entries(buckets)
  .sort()
  .forEach(([k, v]) => {
    v.sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < v.length; i++) {
      if (v[i] !== v[i - 1] + 1) gaps.push(v[i - 1] + "->" + v[i]);
    }
    if (gaps.length)
      console.log(" ", k, "gaps:", gaps.join(", "), "| range:", v[0] + "-" + v[v.length - 1]);
  });

// Check for empty front/back
const cards = [...t.matchAll(/\{ id: "([^"]+)", front: "([^"]*)", back: "([^"]*)"/g)];
console.log("\nCard validation:");
console.log("Total parsed:", cards.length);
cards.forEach(([_, id, front, back]) => {
  if (!front || !back) console.log("  EMPTY", id, "| front:", front.length, "| back:", back.length);
});
