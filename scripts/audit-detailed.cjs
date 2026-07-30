// So sánh chi tiết từng topic với PDF nguồn
// Mục tiêu: tìm từ bị thiếu (có trong PDF nhưng không có trong TS)
const fs = require("fs");
const path = require("path");

const PDF_TEXT_DIR = "./scripts/pdf-text";
const TS_FILES = {
  1: "./lib/flashcards-ielts-vocab-1.ts",
  2: "./lib/flashcards-ielts-vocab-2.ts",
  3: "./lib/flashcards-ielts-vocab-3.ts",
  4: "./lib/flashcards-ielts-vocab-4.ts",
  5: "./lib/flashcards-ielts-vocab-5.ts",
  6: "./lib/flashcards-ielts-vocab-6.ts",
  7: "./lib/flashcards-ielts-vocab-7.ts",
  8: "./lib/flashcards-ielts-vocab-8.ts",
  9: "./lib/flashcards-ielts-vocab-9.ts",
  10: "./lib/flashcards-ielts-vocab-10.ts",
  11: "./lib/flashcards-ielts-vocab-11.ts",
  12: "./lib/flashcards-ielts-vocab-12.ts",
  13: "./lib/flashcards-ielts-vocab-13.ts",
};

// Mapping PDF file -> TS file + topic name
const MAPPING = [
  {
    ts: 1,
    pdf: "Ti_n_t__h_u_t__trong_ti_ng_Anh-ielts-nguyenhuyen.txt",
    topic: "Prefix-Suffix",
    extractFirst: "TIỀN TỐ",
  },
  {
    ts: 1,
    pdf: "Tu-vung-ielts-appearance-character-traits-ieltsnguyenhuyen.txt",
    topic: "Appearance",
  },
  { ts: 2, pdf: "Tu-vung-ielts-family-ieltsnguyenhuyen.txt", topic: "Family" },
  { ts: 3, pdf: "Tu-vung-ielts-covid-19-ieltsnguyenhuyen.txt", topic: "Covid-19" },
  { ts: 3, pdf: "Tu-vung-ielts-crime-ieltsnguyenhuyen.txt", topic: "Crime" },
  { ts: 4, pdf: "Tu-vung-ielts-daily-routines-ieltsnguyenhuyen.txt", topic: "Daily Routines" },
  { ts: 5, pdf: "Tu-vung-ielts-education-ieltsnguyenhuyen.txt", topic: "Education" },
  {
    ts: 5,
    pdf: "tu-vung-ielts---chu-de-environment---ielts-nguyenhuyen.txt",
    topic: "Environment",
  },
  { ts: 6, pdf: "Tu-vung-ielts-languages-ielts-nguyenhuyen.txt", topic: "Languages" },
  { ts: 6, pdf: "Tu-vung-ielts-makeup-ieltsnguyenhuyen.txt", topic: "Makeup" },
  { ts: 7, pdf: "Tu-vung-ielts-money-ielts-nguyenhuyen.txt", topic: "Money" },
  { ts: 7, pdf: "tu-vung-ielts-poverty-ieltsnguyenhuyen.txt", topic: "Poverty" },
  { ts: 8, pdf: "Tu-vung-ielts-social-media.txt", topic: "Social Media" },
  { ts: 8, pdf: "Tu-vung-ielts-work-ieltsnguyenhuyen.txt", topic: "Work" },
  { ts: 9, pdf: "B__t__v_ng_IELTS_Writing_Task_1-ielts-nguyenhuyen.txt", topic: "Writing Task 1" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-air-pollution.txt", topic: "Air Pollution" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-animals.txt", topic: "Animals" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-animal-testing.txt", topic: "Animal Testing" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-animal-extinction.txt", topic: "Animal Extinction" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-water-pollution.txt", topic: "Water Pollution" },
  { ts: 10, pdf: "tu-vung-ielts---chu-de-world-hunger.txt", topic: "World Hunger" },
  { ts: 11, pdf: "tu-vung-ielts---chu-de-artificial-intelligence.txt", topic: "AI" },
  { ts: 11, pdf: "tu-vung-ielts---chu-de-energy---ielts-nguyenhuyen.txt", topic: "Energy" },
  { ts: 11, pdf: "tu-vung-ielts---chu-de-technology---ielts-nguyenhuyen.txt", topic: "Technology" },
  { ts: 11, pdf: "tu-vung-ielts---chu-de-foreign-aid.txt", topic: "Foreign Aid" },
  {
    ts: 11,
    pdf: "tu-vung-ielts---chu-de-government-spending---ielts-nguyenhuyen.txt",
    topic: "Government Spending",
  },
  { ts: 11, pdf: "tu-vung-ielts---chu-de-stress.txt", topic: "Stress" },
  {
    ts: 11,
    pdf: "tu-vung-ielts-chu-de-overpopulation---ielts-nguyenhuyen.txt",
    topic: "Overpopulation",
  },
  { ts: 12, pdf: "tu-vung-ielts---chu-de-city-life---ielts-nguyenhuyen.txt", topic: "City Life" },
  { ts: 12, pdf: "tu-vung-ielts---chu-de-culture---ielts-nguyenhuyen.txt", topic: "Culture" },
  { ts: 12, pdf: "tu-vung-ielts---chu-de-tourism---ielts-nguyenhuyen.txt", topic: "Tourism" },
  { ts: 12, pdf: "tu-vung-ielts---chu-de-transport---ielts-nguyenhuyen.txt", topic: "Transport" },
  {
    ts: 12,
    pdf: "tu-vung-ielts---chu-de-housing-and-architecture---ielts-nguyenhuyen.txt",
    topic: "Housing",
  },
  {
    ts: 12,
    pdf: "tu-vung-ielts---chu-de-wrorking-from-home---ielts-nguyenhuyen.txt",
    topic: "Working from Home",
  },
  { ts: 12, pdf: "tu-vung-ielts-chu-de-christmas---ielts-nguyenhuyen.txt", topic: "Christmas" },
  { ts: 12, pdf: "tu-vung-ielts-chu-de-tet-holiday---ielts-nguyenhuyen.txt", topic: "Tet Holiday" },
  {
    ts: 12,
    pdf: "tu-vung-ielts-chu-de-sport-and-exercise---ielts-nguyenhuyen.txt",
    topic: "Sport",
  },
  {
    ts: 13,
    pdf: "tu-vung-ielts---chu-de-business-and-money---ielts-nguyenhuyen.txt",
    topic: "Business",
  },
  {
    ts: 13,
    pdf: "tu-vung-ielts-chu-de-family-structure-and-family-roles---ielts-nguyenhuyen.txt",
    topic: "Family Structure",
  },
  { ts: 13, pdf: "tu-vung-ielts---chu-de-average-life-expectancy.txt", topic: "Life Expectancy" },
  {
    ts: 13,
    pdf: "tu-vung-ielts-chu-de-ageing-population---ielts-nguyenhuyen.txt",
    topic: "Ageing Population",
  },
  { ts: 13, pdf: "tu-vung-ielts---chu-de-health---ielts-nguyenhuyen.txt", topic: "Health" },
  {
    ts: 13,
    pdf: "tu-vung-ielts---chu-de-throwaway-society---ielts-nguyenhuyen.txt",
    topic: "Throwaway Society",
  },
  {
    ts: 13,
    pdf: "tu-vung-ielts-chu-de-the-gap-between-rich-and-poor---ielts-nguyenhuyen-(1).txt",
    topic: "Gap Rich Poor",
  },
];

// Extract English bullets from PDF text file
function extractEnBullets(pdfText) {
  const lines = pdfText.split("\n");
  const bullets = [];
  let inEnglishSection = false;
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // Heuristic: bullets that contain a colon (English: Vietnamese pattern) and are not headers
    // Headers are usually ALL CAPS or have no colon
    if (
      line.match(/^[\u201c\u201d\u2018\u2019"']/) ||
      (line.match(/^[A-Z]{4,}/) && !line.includes(":"))
    ) {
      continue; // skip header
    }
    if (line.includes(":") || line.includes("=")) {
      // might be a vocab line
      const cleaned = line.replace(/^[\u2022\-\*\d\.\)\(]+\s*/, "").replace(/^["']|["']$/g, "");
      if (cleaned.length > 5) bullets.push(cleaned);
    }
  }
  return bullets;
}

// Extract all fronts from a TS file
function extractTsFronts(tsContent, topicName) {
  // Find all cards: { id: "...", front: "...", back: "..." }
  // Use a robust regex that handles multi-line strings
  const fronts = [];
  const regex = /front:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  let m;
  while ((m = regex.exec(tsContent)) !== null) {
    let f = m[1].slice(1, -1);
    // unescape
    f = f.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    fronts.push(f);
  }
  return fronts;
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[.,!?;:"'()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 2);
}

function jaccard(a, b) {
  const aT = new Set(tokenize(a));
  const bT = new Set(tokenize(b));
  if (aT.size === 0 || bT.size === 0) return 0;
  let inter = 0;
  for (const t of aT) if (bT.has(t)) inter++;
  return inter / (aT.size + bT.size - inter);
}

console.log("=== DETAILED AUDIT: PDF vs TS ===\n");
const summary = [];
for (const m of MAPPING) {
  const pdfPath = path.join(PDF_TEXT_DIR, m.pdf);
  if (!fs.existsSync(pdfPath)) {
    summary.push({ topic: m.topic, ts: m.ts, status: "PDF NOT FOUND" });
    continue;
  }
  const tsPath = TS_FILES[m.ts];
  if (!fs.existsSync(tsPath)) {
    summary.push({ topic: m.topic, ts: m.ts, status: "TS NOT FOUND" });
    continue;
  }

  const pdfText = fs.readFileSync(pdfPath, "utf8");
  const tsText = fs.readFileSync(tsPath, "utf8");

  const pdfBullets = extractEnBullets(pdfText);
  const tsFronts = extractTsFronts(tsText, m.topic);

  // For each PDF bullet, find best match in TS
  let missing = 0;
  const missingList = [];
  for (const pb of pdfBullets) {
    let bestScore = 0;
    for (const tf of tsFronts) {
      const s = jaccard(pb, tf);
      if (s > bestScore) bestScore = s;
    }
    if (bestScore < 0.3) {
      // genuinely missing
      // but skip if it's just a header/garbage
      if (pb.length > 10 && pb.match(/[a-z]{3,}/i)) {
        missing++;
        if (missingList.length < 5) missingList.push(pb);
      }
    }
  }
  summary.push({
    topic: m.topic,
    ts: m.ts,
    pdfBullets: pdfBullets.length,
    tsFronts: tsFronts.length,
    missing,
    missingList,
  });
}

// Print
let totalMissing = 0;
for (const s of summary) {
  if (s.status) {
    console.log(`[TS${s.ts}] ${s.topic}: ${s.status}`);
  } else {
    const flag = s.missing > 5 ? "⚠️" : "✅";
    console.log(
      `${flag} [TS${s.ts}] ${s.topic}: PDF=${s.pdfBullets} bullets, TS=${s.tsFronts} fronts, missing≈${s.missing}`,
    );
    if (s.missing > 5) {
      totalMissing += s.missing;
      s.missingList.forEach((x) => console.log(`     - ${x}`));
    }
  }
}
console.log(
  `\n=== Total topics with significant missing: ${summary.filter((s) => s.missing > 5).length} ===`,
);
