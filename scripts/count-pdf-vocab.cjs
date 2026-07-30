#!/usr/bin/env node
/**
 * count-pdf-vocab.cjs — Đếm tổng số từ vựng trong mỗi PDF (text đã extract)
 * Mục đích: xác định tổng số từ vựng mỗi PDF để so với TS
 *
 * Cách đếm: tìm các dòng bắt đầu bằng "•" hoặc dạng "1. word: meaning"
 * trong PDF text. Loại bỏ dòng ngắn / tiêu đề / page header.
 */

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "pdf-text");
const FILES = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".txt"))
  .sort();

const STATS = {};
const DETAIL = {};

for (const f of FILES) {
  const src = fs.readFileSync(path.join(DIR, f), "utf8");
  const lines = src.split(/\r?\n/);

  let count = 0;
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Bỏ qua dòng quá ngắn
    if (trimmed.length < 4) continue;
    if (trimmed.startsWith("=== END PAGE")) continue;

    // Bullet bắt đầu bằng "•"
    if (trimmed.startsWith("•")) {
      const content = trimmed.replace(/^•\s*/, "").trim();
      // Loại bỏ tiêu đề
      if (
        /^(Bộ|Từ vựng|Phần|Ví dụ|Source|Nguồn|Cách|Hoạt động|Ghi chú|Idioms|Phrases|Pros|Cons|Xem thêm|SYNONYMS|ANTONYMS|HOME|HOMEWORD|PHRASAL)/i.test(
          content,
        )
      ) {
        continue;
      }
      if (content.length < 6) continue;
      count++;
      items.push(content);
      continue;
    }

    // Bullet dạng "1. word: meaning"
    const m = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (m) {
      const content = m[1].trim();
      if (content.length < 6) continue;
      count++;
      items.push(content);
      continue;
    }

    // Dòng bắt đầu bằng "o\t" hoặc "o  " (sub-bullets)
    if (trimmed.startsWith("o\t") || trimmed.startsWith("o  ")) {
      const content = trimmed.replace(/^o\s+/, "").trim();
      if (content.length < 6) continue;
      count++;
      items.push(content);
    }
  }

  STATS[f] = count;
  DETAIL[f] = items;
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  Thống kê từ vựng trong 20 PDF");
console.log("═══════════════════════════════════════════════════════════════\n");

let total = 0;
for (const [f, c] of Object.entries(STATS).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.toString().padStart(4)}  ${f}`);
  total += c;
}
console.log(`  ────`);
console.log(`  ${total.toString().padStart(4)}  TOTAL bullets`);

// Lưu lại để script khác xài
fs.writeFileSync(
  path.join(__dirname, "pdf-vocab-detail.json"),
  JSON.stringify(DETAIL, null, 2),
  "utf8",
);
console.log("\nĐã lưu chi tiết vào scripts/pdf-vocab-detail.json");
