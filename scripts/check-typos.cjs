// Check for common typos in cards
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

const typoPatterns = [
  { pattern: /\bwich\b/g, should: "which" },
  { pattern: /\bsouce\b/g, should: "source" },
  { pattern: /\bsourse\b/g, should: "source" },
  { pattern: /\bthrought\b/g, should: "through" },
  { pattern: /\brecieve\b/g, should: "receive" },
  { pattern: /\bpepole\b/g, should: "people" },
  { pattern: /\bcomming\b/g, should: "coming" },
  { pattern: /\bstrict\b/g, should: "strict" },
  { pattern: /\brelise\b/g, should: "realise" },
  { pattern: /\bmuust\b/g, should: "must" },
  { pattern: /\bpubllic\b/g, should: "public" },
  { pattern: /\bspecfic\b/g, should: "specific" },
];

const found = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  for (const { pattern, should } of typoPatterns) {
    let m;
    while ((m = pattern.exec(src)) !== null) {
      const lineNo = src.substring(0, m.index).split("\n").length;
      found.push(`${f}:${lineNo} - "${m[0]}" → should be "${should}"`);
    }
  }
}

console.log(`Found ${found.length} typos:`);
found.forEach((x) => console.log(`  ${x}`));
