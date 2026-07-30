// Check format toàn diện cho tất cả 13 files
const fs = require("fs");

const files = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(
  (n) => "./lib/flashcards-ielts-vocab-" + n + ".ts",
);

// Unbalanced braces check
const issues = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");

  const cardRegex =
    /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*(["'])([\s\S]*?)\2\s*,\s*back:\s*(["'])([\s\S]*?)\4[\s\S]*?\}/g;
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    const id = m[1];
    const front = m[3];
    const back = m[5];

    // Check unbalanced { } in front/back
    const frontOpen = (front.match(/\{/g) || []).length;
    const frontClose = (front.match(/\}/g) || []).length;
    if (frontOpen !== frontClose) {
      issues.push(`${f}: ${id} - front has ${frontOpen} { but ${frontClose} }`);
    }
    const backOpen = (back.match(/\{/g) || []).length;
    const backClose = (back.match(/\}/g) || []).length;
    if (backOpen !== backClose) {
      issues.push(`${f}: ${id} - back has ${backOpen} { but ${backClose} }`);
    }
    // Check suspicious Vietnamese characters in pure-English front (no Vietnamese in front expected)
    if (
      /[ăâđêôơưĂÂĐÊÔƠƯáàảãạằẳẵặắấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/.test(front)
    ) {
      issues.push(`${f}: ${id} - front contains Vietnamese chars: "${front.substring(0, 50)}..."`);
    }
  }
}

console.log(`Format issues found: ${issues.length}`);
issues.slice(0, 30).forEach((i) => console.log("  " + i));
if (issues.length === 0) console.log("  ✅ All 13 files passed format check.");
