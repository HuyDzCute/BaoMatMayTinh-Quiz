// Check duplicates across all 13 files
const fs = require("fs");
const files = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(
  (n) => "./lib/flashcards-ielts-vocab-" + n + ".ts",
);
const all = new Set();
const dup = [];
const locations = new Map();
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const matches = src.match(/id:\s*["']([^"']+)["']/g) || [];
  for (const m of matches) {
    const id = m.match(/["']([^"']+)["']/)[1];
    if (all.has(id)) {
      dup.push(id);
      if (!locations.has(id)) locations.set(id, []);
      locations.get(id).push(f);
    } else {
      all.add(id);
      locations.set(id, [f]);
    }
  }
}
console.log("Total unique IDs:", all.size);
console.log("Cross-file duplicate IDs:", dup.length);
console.log("\nDuplicate details:");
const uniqueDups = [...new Set(dup)];
uniqueDups.slice(0, 30).forEach((d) => {
  console.log("  " + d + " -> in " + locations.get(d).join(" AND "));
});
