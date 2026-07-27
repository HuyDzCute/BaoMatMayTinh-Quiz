// Final audit: check duplicate IDs, empty fields, malformed cards
const fs = require("fs");
const files = [
  "./lib/flashcards-ielts-vocab-1.ts",
  "./lib/flashcards-ielts-vocab-2.ts",
  "./lib/flashcards-ielts-vocab-3.ts",
  "./lib/flashcards-ielts-vocab-4.ts",
  "./lib/flashcards-ielts-vocab-5.ts",
  "./lib/flashcards-ielts-vocab-6.ts",
  "./lib/flashcards-ielts-vocab-7.ts",
  "./lib/flashcards-ielts-vocab-8.ts",
  "./lib/flashcards-ielts-vocab-9.ts",
];

const idMap = new Map();
const issues = { duplicateIds: [], emptyFront: [], emptyBack: [], noPron: [], noExample: [] };

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  // Tìm tất cả card objects với id, front, back
  const cardRegex =
    /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*["']([^"']*)["'],\s*back:\s*["']([^"']*)["'],\s*pronunciation:\s*["']([^"']*)["']/g;
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    const [_, id, front, back, pron] = m;
    // Check duplicate
    if (idMap.has(id)) {
      issues.duplicateIds.push(`${id} (in ${f} and ${idMap.get(id)})`);
    } else {
      idMap.set(id, f);
    }
    // Check empty fields
    if (!front.trim()) issues.emptyFront.push(`${id} in ${f}`);
    if (!back.trim()) issues.emptyBack.push(`${id} in ${f}`);
    if (!pron.trim()) issues.noPron.push(`${id} in ${f}`);
  }
}

console.log(`\n=== Duplicate IDs (${issues.duplicateIds.length}) ===`);
issues.duplicateIds.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Empty front (${issues.emptyFront.length}) ===`);
issues.emptyFront.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Empty back (${issues.emptyBack.length}) ===`);
issues.emptyBack.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== No pronunciation (${issues.noPron.length}) ===`);
issues.noPron.slice(0, 20).forEach((x) => console.log(`  ${x}`));

console.log(`\n=== Card counts per file ===`);
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const matches = src.match(/{\s*id:\s*["']/g) || [];
  console.log(`  ${f}: ${matches.length} cards`);
}
