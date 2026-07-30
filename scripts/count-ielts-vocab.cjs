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
let total = 0;
files.forEach((f) => {
  const src = fs.readFileSync(f, "utf8");
  const matches = src.match(/\{\s*id:\s*["']/g) || [];
  const count = matches.length;
  total += count;
  console.log(f + ": " + count + " cards");
});
console.log("Total:", total);
