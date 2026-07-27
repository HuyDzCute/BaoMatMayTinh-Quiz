// Compare PDF vs TS cho 4 file data mới (10-13)
const fs = require("fs");
const path = require("path");

const PDF_DETAIL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "pdf-vocab-detail.json"), "utf8"),
);

const TS_DIR = path.join(process.cwd(), "lib");

// Mapping PDF → TS file (chỉ các file mới)
const MAPPING = [
  {
    pdfKey: "tu-vung-ielts---chu-de-air-pollution.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "Air Pollution",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-animal-testing.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "Animal Testing",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-animals.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "Animals",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-animal-extinction.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "Animal Extinction",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-water-pollution.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "Water Pollution",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-world-hunger.txt",
    ts: "flashcards-ielts-vocab-10.ts",
    topic: "World Hunger",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-artificial-intelligence.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Artificial Intelligence",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-energy---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Energy",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-technology---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Technology",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-foreign-aid.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Foreign Aid",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-government-spending---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Government Spending",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-stress.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Stress",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-overpopulation---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-11.ts",
    topic: "Overpopulation",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-city-life---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "City Life",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-culture---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Culture",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-tourism---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Tourism",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-transport---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Transport",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-housing-and-architecture---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Housing and Architecture",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-wrorking-from-home---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Working from Home",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-christmas---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Christmas",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-tet-holiday---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Tet Holiday",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-sport-and-exercise---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-12.ts",
    topic: "Sport and Exercise",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-business-and-money---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Business and Money",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-family-structure-and-family-roles---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Family Structure",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-average-life-expectancy.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Average Life Expectancy",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-ageing-population---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Ageing Population",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-health---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Health",
  },
  {
    pdfKey: "tu-vung-ielts---chu-de-throwaway-society---ielts-nguyenhuyen.txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Throwaway Society",
  },
  {
    pdfKey: "tu-vung-ielts-chu-de-the-gap-between-rich-and-poor---ielts-nguyenhuyen-(1).txt",
    ts: "flashcards-ielts-vocab-13.ts",
    topic: "Gap Between Rich and Poor",
  },
];

function parseTsCards(tsPath) {
  const src = fs.readFileSync(tsPath, "utf8");
  const cards = [];
  const cardRe =
    /\{\s*id:\s*["']([^"']+)["']\s*,\s*front:\s*(["'])([\s\S]*?)\2\s*,\s*back:\s*(["'])([\s\S]*?)\4[\s\S]*?\}/g;
  let m;
  while ((m = cardRe.exec(src)) !== null) {
    cards.push({ id: m[1], front: m[3].replace(/\\"/g, '"'), back: m[5].replace(/\\"/g, '"') });
  }
  return cards;
}

const tsCache = {};
function getTsCards(file) {
  if (!tsCache[file]) tsCache[file] = parseTsCards(path.join(TS_DIR, file));
  return tsCache[file];
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\/[^/]+\//g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[.,;:!?→←]/g, " ")
    .replace(/[^a-z0-9\s\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a, b) {
  const A = normalize(a),
    B = normalize(b);
  if (A === B) return 1;
  if (!A || !B) return 0;
  if (A.includes(B) || B.includes(A)) return 0.85;
  const aW = new Set(A.split(/\s+/)),
    bW = new Set(B.split(/\s+/));
  let common = 0;
  for (const w of aW) if (bW.has(w)) common++;
  const union = aW.size + bW.size - common;
  return union === 0 ? 0 : common / union;
}

function extractEn(bullet) {
  let s = bullet;
  const colonIdx = s.indexOf(":");
  if (colonIdx > 0) s = s.substring(0, colonIdx).trim();
  s = s.replace(/\([^)]*\)\s*$/, "").trim();
  return s;
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  So sánh PDF vs TS — VOCAB-IELTS (NEW FILES 10-13)");
console.log("═══════════════════════════════════════════════════════════════\n");

let totalMissingInTs = 0;
let totalMissingInPdf = 0;

for (const m of MAPPING) {
  const pdfBullets = PDF_DETAIL[m.pdfKey] || [];
  const tsCards = getTsCards(m.ts);
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📂 ${m.topic}  (PDF: ${pdfBullets.length} lines, TS: ${tsCards.length} cards)`);
  console.log(`${"─".repeat(70)}\n`);

  const missingInTs = [];
  for (const bullet of pdfBullets) {
    const enPart = extractEn(bullet);
    if (enPart.length < 5) continue;
    let best = 0;
    for (const card of tsCards) {
      const score = similarity(enPart, card.front);
      if (score > best) best = score;
    }
    if (best < 0.4) missingInTs.push({ bullet, best });
  }
  const missingInPdf = [];
  for (const card of tsCards) {
    let best = 0;
    for (const bullet of pdfBullets) {
      const enPart = extractEn(bullet);
      if (enPart.length < 5) continue;
      const score = similarity(card.front, enPart);
      if (score > best) best = score;
    }
    if (best < 0.4) missingInPdf.push({ card, best });
  }

  if (missingInTs.length > 0) {
    console.log(`❌ CÓ THỂ THIẾU TRONG TS (${missingInTs.length}):`);
    missingInTs
      .slice(0, 15)
      .forEach((x, i) => console.log(`  ${i + 1}. "${x.bullet.substring(0, 100)}"`));
    totalMissingInTs += missingInTs.length;
  }
  if (missingInPdf.length > 0) {
    console.log(`⚠️  CÓ THỂ THỪA TRONG TS (${missingInPdf.length}):`);
    missingInPdf
      .slice(0, 15)
      .forEach((x, i) => console.log(`  ${i + 1}. "${x.card.front.substring(0, 100)}"`));
    totalMissingInPdf += missingInPdf.length;
  }
  if (missingInTs.length === 0 && missingInPdf.length === 0) console.log(`✅ Khớp hoàn toàn.`);
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`TOTAL missing-in-TS: ${totalMissingInTs}`);
console.log(`TOTAL missing-in-PDF: ${totalMissingInPdf}`);
