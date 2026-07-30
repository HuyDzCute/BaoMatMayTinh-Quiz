// Check IPA format
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

const wrong = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const cardRegex = /\{\s*id:\s*["']([^"']+)["'],\s*front:[^}]+pronunciation:\s*["']([^"']+)["']/g;
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    const id = m[1];
    const pron = m[2];
    // Check IPA starts with / and ends with /
    if (!pron.startsWith("/") || !pron.endsWith("/")) {
      wrong.push(`${f}: ${id} - "${pron}" (không có / ở đầu/cuối)`);
    }
  }
}

console.log(`IPA không hợp lệ: ${wrong.length}`);
wrong.forEach((x) => console.log(`  ${x}`));
