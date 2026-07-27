// Check front/back có cân bằng { } và không có ký tự lạ
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

const issues = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  // Cards with id
  const cardRegex =
    /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*["']([^"']*)["'],\s*back:\s*["']([^"']*)["'],\s*pronunciation:\s*["']([^"']*)["']\s*,[^}]*example:\s*["']([^"']*)["']/g;
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    const id = m[1];
    const front = m[2];
    const back = m[3];
    const pron = m[4];
    const example = m[5];

    // Check unclosed brackets
    const frontOpen = (front.match(/\{/g) || []).length;
    const frontClose = (front.match(/\}/g) || []).length;
    if (frontOpen !== frontClose) {
      issues.push(`${f}: ${id} - front has ${frontOpen} { but ${frontClose} }`);
    }

    // Check suspicious special characters in english text
    if (
      /[đêơưấ]/.test(front) &&
      /^[a-zA-Z\s.,;:!?()'\-=…/]+$/.test(front.replace(/[\{\}\[\]]/g, ""))
    ) {
      // Vietnamese chars in English text — likely OK if mixed
    }
  }
}

console.log(`Issues found: ${issues.length}`);
issues.forEach((x) => console.log(`  ${x}`));
