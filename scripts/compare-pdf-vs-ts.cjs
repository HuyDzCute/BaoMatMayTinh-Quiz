#!/usr/bin/env node
/**
 * compare-pdf-vs-ts.cjs — So sánh từ vựng giữa PDF (text đã extract) và TS files
 *
 * Input:
 *  - scripts/pdf-vocab-detail.json: bullets đã trích từ PDF
 *  - lib/flashcards-ielts-vocab-*.ts: cards đã code
 *
 * Output: danh sách missing/wrong
 */

const fs = require("fs");
const path = require("path");

const PDF_DETAIL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "pdf-vocab-detail.json"), "utf8"),
);

// Normalize keys: lấy phần đầu trước dấu "-" cuối cùng (hoặc ielts-)
// để dùng làm lookup key
const PDF_KEYS = {};
for (const k of Object.keys(PDF_DETAIL)) {
  // Loại bỏ đuôi "-ielts-nguyenhuyen.txt" hoặc "-ieltsnguyenhuyen.txt"
  const base = k
    .replace(/-ielts-nguyenhuyen\.txt$/, "")
    .replace(/-ielts-nguyenhuyen\.txt$/, "")
    .replace(/-ielts-nguyenhuyen\.txt$/, "");
  PDF_KEYS[base] = PDF_DETAIL[k];
}

const TS_DIR = path.join(process.cwd(), "lib");

// Mapping - PDF_KEY được rút gọn từ filename
const MAPPING = [
  {
    pdfKey: "B__t__v_ng_IELTS_Writing_Task_1",
    ts: "flashcards-ielts-vocab-9.ts",
    name: "Writing Task 1",
  },
  {
    pdfKey: "Tu-vung-ielts-appearance-character-traits",
    ts: "flashcards-ielts-vocab-1.ts",
    name: "Appearance",
  },
  { pdfKey: "Tu-vung-ielts-cohabitation", ts: "flashcards-ielts-vocab-2.ts", name: "Cohabitation" },
  { pdfKey: "Tu-vung-ielts-covid-19", ts: "flashcards-ielts-vocab-3.ts", name: "Covid-19" },
  { pdfKey: "Tu-vung-ielts-crime", ts: "flashcards-ielts-vocab-3.ts", name: "Crime" },
  {
    pdfKey: "Tu-vung-ielts-daily-routines",
    ts: "flashcards-ielts-vocab-4.ts",
    name: "Daily Routines",
  },
  { pdfKey: "Tu-vung-ielts-education", ts: "flashcards-ielts-vocab-5.ts", name: "Education" },
  { pdfKey: "Tu-vung-ielts-family", ts: "flashcards-ielts-vocab-2.ts", name: "Family" },
  { pdfKey: "Tu-vung-ielts-free-time", ts: "flashcards-ielts-vocab-4.ts", name: "Free Time" },
  { pdfKey: "Tu-vung-ielts-friendship", ts: "flashcards-ielts-vocab-2.ts", name: "Friendship" },
  {
    pdfKey: "Tu-vung-ielts-genetically-modified-food",
    ts: "flashcards-ielts-vocab-5.ts",
    name: "GM Food",
  },
  {
    pdfKey: "Tu-vung-ielts-global-warming",
    ts: "flashcards-ielts-vocab-5.ts",
    name: "Global Warming",
  },
  { pdfKey: "Tu-vung-ielts-languages", ts: "flashcards-ielts-vocab-6.ts", name: "Languages" },
  { pdfKey: "Tu-vung-ielts-makeup", ts: "flashcards-ielts-vocab-6.ts", name: "Makeup" },
  { pdfKey: "Tu-vung-ielts-money", ts: "flashcards-ielts-vocab-7.ts", name: "Money" },
  {
    pdfKey: "Tu-vung-ielts-plastic-pollution",
    ts: "flashcards-ielts-vocab-5.ts",
    name: "Plastic Pollution",
  },
  { pdfKey: "tu-vung-ielts-poverty", ts: "flashcards-ielts-vocab-7.ts", name: "Poverty" },
  { pdfKey: "Tu-vung-ielts-social-media", ts: "flashcards-ielts-vocab-8.ts", name: "Social Media" },
  { pdfKey: "Tu-vung-ielts-work", ts: "flashcards-ielts-vocab-8.ts", name: "Work" },
];

// ─── Parse TS ────────────────────────────────────────────────────────────────

function parseTsCards(tsPath) {
  const src = fs.readFileSync(tsPath, "utf8");
  const cards = [];
  const cardRe =
    /\{\s*id:\s*["']([^"']+)["']\s*,\s*front:\s*(["'])([\s\S]*?)\2\s*,\s*back:\s*(["'])([\s\S]*?)\4[\s\S]*?\}/g;
  let m;
  while ((m = cardRe.exec(src)) !== null) {
    cards.push({
      id: m[1],
      front: m[3].replace(/\\"/g, '"'),
      back: m[5].replace(/\\"/g, '"'),
    });
  }
  return cards;
}

const tsCache = {};
function getTsCards(file) {
  if (!tsCache[file]) tsCache[file] = parseTsCards(path.join(TS_DIR, file));
  return tsCache[file];
}

// ─── Normalize ───────────────────────────────────────────────────────────────

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\/[^/]+\//g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[.,;:!?]/g, " ")
    .replace(/[^a-z0-9\s\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (A === B) return 1;
  if (!A || !B) return 0;
  if (A.includes(B) || B.includes(A)) return 0.85;

  const aW = new Set(A.split(/\s+/));
  const bW = new Set(B.split(/\s+/));
  let common = 0;
  for (const w of aW) if (bW.has(w)) common++;
  const union = aW.size + bW.size - common;
  return union === 0 ? 0 : common / union;
}

/** Lấy phần tiếng Anh từ bullet PDF (phần trước dấu ":" đầu tiên) */
function extractEn(bullet) {
  // Bỏ phần "... (abc)" ở cuối vì thường là example
  let s = bullet;
  // Dạng: "english phrase: nghĩa tiếng Việt"
  const colonIdx = s.indexOf(":");
  if (colonIdx > 0) s = s.substring(0, colonIdx).trim();
  // Bỏ "(...)" ở cuối
  s = s.replace(/\([^)]*\)\s*$/, "").trim();
  return s;
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════════");
console.log("  So sánh PDF vs TS — VOCAB-IELTS");
console.log("═══════════════════════════════════════════════════════════════\n");

for (const m of MAPPING) {
  const pdfBullets = PDF_KEYS[m.pdfKey] || [];
  const tsCards = getTsCards(m.ts);

  console.log(`\n${"─".repeat(70)}`);
  console.log(`📂 ${m.name}  (PDF: ${pdfBullets.length} bullets, TS: ${tsCards.length} cards)`);
  console.log(`${"─".repeat(70)}\n`);

  // 1. Tìm bullet trong PDF không match với bất kỳ card TS nào
  const missingInTs = [];
  for (const bullet of pdfBullets) {
    const enPart = extractEn(bullet);
    if (enPart.length < 3) continue;
    let best = 0;
    for (const card of tsCards) {
      const score = similarity(enPart, card.front);
      if (score > best) best = score;
    }
    if (best < 0.5) {
      missingInTs.push({ bullet, best });
    }
  }

  // 2. Tìm card TS không match với bất kỳ bullet PDF nào
  const missingInPdf = [];
  for (const card of tsCards) {
    let best = 0;
    for (const bullet of pdfBullets) {
      const enPart = extractEn(bullet);
      if (enPart.length < 3) continue;
      const score = similarity(card.front, enPart);
      if (score > best) best = score;
    }
    if (best < 0.5) {
      missingInPdf.push({ card, best });
    }
  }

  if (missingInTs.length > 0) {
    console.log(`❌ CÓ THỂ THIẾU TRONG TS (${missingInTs.length}):`);
    missingInTs.forEach((x, i) => {
      console.log(`  ${i + 1}. "${x.bullet.substring(0, 90)}${x.bullet.length > 90 ? "..." : ""}"`);
    });
    console.log();
  }

  if (missingInPdf.length > 0) {
    console.log(`⚠️  CÓ THỂ THỪA TRONG TS (${missingInPdf.length}):`);
    missingInPdf.forEach((x, i) => {
      console.log(
        `  ${i + 1}. "${x.card.front.substring(0, 90)}${x.card.front.length > 90 ? "..." : ""}"`,
      );
    });
    console.log();
  }

  if (missingInTs.length === 0 && missingInPdf.length === 0) {
    console.log(`✅ Khớp hoàn toàn.`);
  }
}
