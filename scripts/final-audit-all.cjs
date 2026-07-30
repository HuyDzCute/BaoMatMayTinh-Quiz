// Final audit for ALL vocab files (1-13): check duplicate IDs, empty fields, IPA format, common typos
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
  "./lib/flashcards-ielts-vocab-10.ts",
  "./lib/flashcards-ielts-vocab-11.ts",
  "./lib/flashcards-ielts-vocab-12.ts",
  "./lib/flashcards-ielts-vocab-13.ts",
];

const idMap = new Map();
const issues = {
  duplicateIds: [],
  emptyFront: [],
  emptyBack: [],
  noPron: [],
  badIPA: [],
  emptyExample: [],
};

// Common English typos
const typoPatterns = [
  { pattern: /\bwich\b/g, should: "which" },
  { pattern: /\bteh\b/g, should: "the" },
  { pattern: /\badn\b/g, should: "and" },
  { pattern: /\brecieve\b/g, should: "receive" },
  { pattern: /\boccured\b/g, should: "occurred" },
  { pattern: /\bseperate\b/g, should: "separate" },
  { pattern: /\bdefinately\b/g, should: "definitely" },
  { pattern: /\bneccessary\b/g, should: "necessary" },
  { pattern: /\boccassion\b/g, should: "occasion" },
  { pattern: /\buntill\b/g, should: "until" },
  { pattern: /\bbecouse\b/g, should: "because" },
  { pattern: /\bcomming\b/g, should: "coming" },
  { pattern: /\bwich is\b/g, should: "which is" },
  { pattern: /\bwich was\b/g, should: "which was" },
];
const foundTypos = [];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  // Match complete card object with id, front, back, pronunciation, example
  const cardRegex =
    /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*["']([^"']*)["'],\s*back:\s*["']([^"']*)["'],\s*pronunciation:\s*["']([^"']*)["']\s*,[\s\S]*?example:\s*["']([^"']*)["']/g;
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    const [_, id, front, back, pron, example] = m;
    if (idMap.has(id)) {
      issues.duplicateIds.push(`${id} (in ${f} and ${idMap.get(id)})`);
    } else {
      idMap.set(id, f);
    }
    if (!front.trim()) issues.emptyFront.push(`${id} in ${f}`);
    if (!back.trim()) issues.emptyBack.push(`${id} in ${f}`);
    if (!pron.trim()) issues.noPron.push(`${id} in ${f}`);
    if (!example.trim()) issues.emptyExample.push(`${id} in ${f}`);
    // IPA must start and end with /
    if (pron.trim() && (!pron.startsWith("/") || !pron.endsWith("/"))) {
      issues.badIPA.push(`${f}: ${id} - "${pron}"`);
    }
  }
  // Check typos in file
  for (const { pattern, should } of typoPatterns) {
    pattern.lastIndex = 0;
    let tm;
    while ((tm = pattern.exec(src)) !== null) {
      const lineNo = src.substring(0, tm.index).split("\n").length;
      foundTypos.push(`${f}:${lineNo} - "${tm[0]}" → should be "${should}"`);
    }
  }
}

console.log(`\n=== Audit Summary ===`);
console.log(`Files audited: ${files.length}`);
console.log(`Total unique IDs: ${idMap.size}`);
console.log(`\n=== Duplicate IDs (${issues.duplicateIds.length}) ===`);
issues.duplicateIds.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Empty front (${issues.emptyFront.length}) ===`);
issues.emptyFront.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Empty back (${issues.emptyBack.length}) ===`);
issues.emptyBack.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== No pronunciation (${issues.noPron.length}) ===`);
issues.noPron.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Bad IPA format (${issues.badIPA.length}) ===`);
issues.badIPA.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Empty example (${issues.emptyExample.length}) ===`);
issues.emptyExample.slice(0, 20).forEach((x) => console.log(`  ${x}`));
console.log(`\n=== Typos (${foundTypos.length}) ===`);
foundTypos.slice(0, 30).forEach((x) => console.log(`  ${x}`));

console.log(`\n=== Card counts per file ===`);
let total = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const matches = src.match(/{\s*id:\s*["']/g) || [];
  console.log(`  ${f.split("/").pop()}: ${matches.length} cards`);
  total += matches.length;
}
console.log(`  TOTAL: ${total} cards across ${files.length} files`);
