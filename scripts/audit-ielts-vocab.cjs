#!/usr/bin/env node
/**
 * audit-ielts-vocab.cjs — Rà soát từ vựng từ 20 PDF gốc so với 10 file TS.
 *
 * Mục đích: tìm ra các từ vựng:
 *  - Bị THIẾU (có trong PDF nhưng không có trong TS)
 *  - Bị SAI (có trong TS nhưng không có trong PDF) - chỉ cảnh báo
 *  - Nghĩa SAI (back field khác với PDF)
 *
 * Cách hoạt động: parse PDF để trích bullets (line bắt đầu "•" hoặc số thứ tự),
 * chuẩn hóa về lowercase, rồi đối chiếu với front field trong các file TS.
 *
 * Output: danh sách MISSING/WRONG để user có thể xem và bổ sung.
 */

const fs = require("fs");
const path = require("path");

const PDF_DIR = "C:\\Users\\Administrator\\Downloads\\VOCABULARY - 2021\\";
const TS_DIR = path.join(process.cwd(), "lib");

// Mapping: PDF → 1 file TS
const FILES = [
  {
    pdf: "Bộ từ vựng IELTS Writing Task 1-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-9.ts"],
    name: "Writing Task 1",
  },
  {
    pdf: "Tiền tố hậu tố trong tiếng Anh-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-1.ts"],
    name: "Prefix & Suffix",
    prefixOnly: true, // chỉ match các prefix/suffix (anti-, re-, ...)
  },
  {
    pdf: "Tu-vung-ielts-appearance-character-traits-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-1.ts"],
    name: "Appearance & Character",
  },
  {
    pdf: "Tu-vung-ielts-cohabitation-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-2.ts"],
    name: "Cohabitation",
  },
  {
    pdf: "Tu-vung-ielts-covid-19-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-3.ts"],
    name: "Covid-19",
  },
  {
    pdf: "Tu-vung-ielts-crime-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-3.ts"],
    name: "Crime",
  },
  {
    pdf: "Tu-vung-ielts-daily-routines-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-4.ts"],
    name: "Daily Routines",
  },
  {
    pdf: "Tu-vung-ielts-education-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-5.ts"],
    name: "Education",
  },
  {
    pdf: "Tu-vung-ielts-family-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-2.ts"],
    name: "Family",
  },
  {
    pdf: "Tu-vung-ielts-free-time-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-4.ts"],
    name: "Free Time",
  },
  {
    pdf: "Tu-vung-ielts-friendship-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-2.ts"],
    name: "Friendship",
  },
  {
    pdf: "Tu-vung-ielts-genetically-modified-food-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-5.ts"],
    name: "GM Food",
  },
  {
    pdf: "Tu-vung-ielts-global-warming-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-5.ts"],
    name: "Global Warming",
  },
  {
    pdf: "Tu-vung-ielts-languages-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-6.ts"],
    name: "Languages",
  },
  {
    pdf: "Tu-vung-ielts-makeup-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-6.ts"],
    name: "Makeup",
  },
  {
    pdf: "Tu-vung-ielts-money-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-7.ts"],
    name: "Money",
  },
  {
    pdf: "Tu-vung-ielts-plastic-pollution-ielts-nguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-5.ts"],
    name: "Plastic Pollution",
  },
  {
    pdf: "tu-vung-ielts-poverty-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-7.ts"],
    name: "Poverty",
  },
  {
    pdf: "Tu-vung-ielts-social-media.pdf",
    ts: ["flashcards-ielts-vocab-8.ts"],
    name: "Social Media",
  },
  {
    pdf: "Tu-vung-ielts-work-ieltsnguyenhuyen.pdf",
    ts: ["flashcards-ielts-vocab-8.ts"],
    name: "Work",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Đọc PDF và trả về các bullets. PDF đã được PDF Reader convert sang text.
 *  Các từ vựng được đánh dấu bằng "•" ở đầu dòng, hoặc bắt đầu bằng số thứ tự
 *  theo sau dấu chấm (1. , 2. , ...).
 */
function parsePdfBullets(pdfPath) {
  const src = fs.readFileSync(pdfPath, "utf8");
  const lines = src.split(/\r?\n/);
  const bullets = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Bullet bắt đầu bằng "•"
    if (line.startsWith("•")) {
      const content = line.replace(/^•\s*/, "").trim();
      bullets.push({ raw: content, lineIdx: i });
      continue;
    }

    // Bullet bắt đầu bằng số "1. " "2. " ...
    const m = /^(\d+)\.\s+(.+)$/.exec(line);
    if (m) {
      bullets.push({ raw: m[2], lineIdx: i });
      continue;
    }

    // Bullet bắt đầu bằng "o" (sub-bullets trong một số file)
    if (line.startsWith("o\t") || line.startsWith("o  ")) {
      const content = line.replace(/^o\s+/, "").trim();
      bullets.push({ raw: content, lineIdx: i });
    }
  }

  return bullets;
}

/** Parse file TS và lấy tất cả các front field (English phrase) của flashcards.
 *  Front field nằm giữa `front: "..."` hoặc `front: '...'`.
 *  Ngoài ra còn lấy back field để so sánh nghĩa.
 */
function parseTsCards(tsPath) {
  const src = fs.readFileSync(tsPath, "utf8");
  const cards = [];

  // Regex đơn giản — đủ cho format đã viết
  const cardRe =
    /\{[^{}]*?id:\s*["']([^"']+)["'][^{}]*?front:\s*(["'])([\s\S]*?)\2[^{}]*?back:\s*(["'])([\s\S]*?)\4[^{}]*?\}/g;
  let m;
  while ((m = cardRe.exec(src)) !== null) {
    cards.push({
      id: m[1],
      front: m[3].replace(/\\"/g, '"'),
      back: m[5].replace(/\\"/g, '"'),
      // raw full match để debug
      raw: m[0],
    });
  }

  return cards;
}

/** Chuẩn hóa 1 phrase để so sánh: lowercase, bỏ punctuation thừa, bỏ ký tự IPA */
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\/[^/]+\//g, "") // bỏ IPA
    .replace(/\([^)]*\)/g, "") // bỏ nội dung trong ngoặc đơn
    .replace(/[.,;:!?]/g, " ")
    .replace(/[^a-z0-9\s\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trích các cụm từ tiếng Anh từ 1 bullet PDF.
 *  Thường có dạng "phrase (kèm nghĩa tiếng Việt)" hoặc "phrase: nghĩa".
 *  Trả về mảng các cụm tiếng Anh có thể xuất hiện.
 */
function extractEnglishPhrases(bulletRaw) {
  // Bỏ phần trong ngoặc vuông / tròn sau dấu ":" - đó là nghĩa
  // Tách theo ":" đầu tiên: phần trước là English, phần sau là Vietnamese
  const colonIdx = bulletRaw.indexOf(":");
  if (colonIdx < 0) return [bulletRaw];

  let en = bulletRaw.substring(0, colonIdx).trim();

  // Bỏ "(...)" cuối vì thường là ví dụ
  en = en.replace(/\([^)]*\)\s*$/, "").trim();

  return [en];
}

/** Tính độ giống nhau giữa 2 chuỗi đã normalize (Levenshtein-based) */
function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (a === b) return 1;
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  // Check substring inclusion first
  if (longer.includes(shorter) || shorter.includes(longer)) return 0.8;

  // Đếm từ chung
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  let common = 0;
  for (const w of aWords) if (bWords.has(w)) common++;
  const union = aWords.size + bWords.size - common;
  return union === 0 ? 0 : common / union;
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════════");
console.log("  Rà soát 20 file PDF gốc vs 10 file TS — VOCAB-IELTS");
console.log("═══════════════════════════════════════════════════════════════\n");

const allBullets = []; // mảng các bullet có gắn tag file nguồn

for (const f of FILES) {
  const pdfPath = path.join(PDF_DIR, f.pdf);
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ Không tìm thấy PDF: ${f.pdf}`);
    continue;
  }

  const bullets = parsePdfBullets(pdfPath);

  // Lọc bỏ những bullet không phải vocabulary thật:
  //  - dòng quá ngắn (< 5 chars)
  //  - dòng bắt đầu bằng "Bộ" "Từ vựng" "Phần" "Thành" "Thành ngữ" "Từ đồng" "SYNONYMS"
  //    "Ví dụ" "Đề bài" "Bài" "Dịch" "Source:" "Nguồn:" "Tóm lại"
  const STOPWORDS = [
    "Bộ",
    "Từ vựng",
    "Phần",
    "Thành ngữ",
    "Thành ngữ",
    "Từ đồng nghĩa",
    "SYNONYMS",
    "Ví dụ",
    "Đề bài",
    "Bài",
    "Dịch",
    "Source",
    "Nguồn",
    "Tóm lại",
    "Cách",
    "Hoạt động",
    "Phrasal verbs",
    "Ghi chú",
    "Phần ví dụ",
    "Idioms",
    "Phrases",
    "Pros",
    "Cons",
    "Xem thêm",
  ];
  const filtered = bullets.filter((b) => {
    if (b.raw.length < 5) return false;
    if (/^Trang|-- \d+ of|-- \d/.test(b.raw)) return false; // page numbers
    // Loại bullet chỉ có chữ số + dấu chấm
    if (/^\d+\.?\s*$/.test(b.raw)) return false;
    return true;
  });

  for (const b of filtered) {
    allBullets.push({
      ...b,
      source: f.name,
      pdf: f.pdf,
      prefixOnly: f.prefixOnly || false,
    });
  }
}

console.log(`Tổng ${allBullets.length} bullet lines từ 20 PDF.\n`);

// Gộp tất cả TS cards
const allTsCards = [];
for (const f of FILES) {
  for (const tsFile of f.ts) {
    const tsPath = path.join(TS_DIR, tsFile);
    if (!fs.existsSync(tsPath)) continue;
    const cards = parseTsCards(tsPath);
    for (const c of cards) {
      allTsCards.push({
        ...c,
        tsFile,
      });
    }
  }
}

console.log(`Tổng ${allTsCards.length} flashcards trong TS files.\n`);

// So sánh: mỗi bullet PDF tìm TS card khớp nhất
console.log("───────────────────────────────────────────────────────────────");
console.log("  PHÂN TÍCH TỪNG BULLET PDF — Tìm từ vựng có thể thiếu");
console.log("───────────────────────────────────────────────────────────────\n");

const missing = [];
const matched = [];
const weakMatch = [];

for (const b of allBullets) {
  const phrases = extractEnglishPhrases(b.raw);

  let bestScore = 0;
  let bestCard = null;
  for (const phrase of phrases) {
    const normPhrase = normalize(phrase);
    if (!normPhrase || normPhrase.length < 3) continue;

    for (const card of allTsCards) {
      const normFront = normalize(card.front);
      const score = similarity(normPhrase, normFront);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
  }

  if (bestScore >= 0.7) {
    matched.push({ bullet: b, card: bestCard, score: bestScore });
  } else if (bestScore >= 0.4) {
    weakMatch.push({ bullet: b, card: bestCard, score: bestScore });
  } else {
    // Bỏ qua những bullet quá ngắn / không phải vocab
    if (b.raw.length < 8) continue;
    if (
      /^(Anti|Auto|Re|Over|Mis|Out|Co|De|Fore|Pre|Sub|Super|Under|Dis)/i.test(b.raw) === false &&
      b.prefixOnly
    ) {
      // Chỉ giữ các bullet là prefix khi file là prefixOnly
      continue;
    }
    missing.push({ bullet: b, card: bestCard, score: bestScore });
  }
}

console.log(`✅ Matched (score >= 0.7): ${matched.length}`);
console.log(`⚠️  Weak match (0.4 <= score < 0.7): ${weakMatch.length}`);
console.log(`❌ Missing/Unknown (score < 0.4): ${missing.length}\n`);

if (missing.length > 0) {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ❌ CÁC BULLET CÓ THỂ THIẾU (cần review thêm)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  // Group by source
  const bySource = {};
  for (const m of missing) {
    if (!bySource[m.bullet.source]) bySource[m.bullet.source] = [];
    bySource[m.bullet.source].push(m);
  }
  for (const [src, items] of Object.entries(bySource)) {
    console.log(`\n📂 [${src}] — ${items.length} bullet có thể thiếu:`);
    items.forEach((m, i) => {
      console.log(`  ${i + 1}. "${m.bullet.raw}"`);
    });
  }
}

if (weakMatch.length > 0) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ⚠️  WEAK MATCH (nên kiểm tra — có thể thiếu hoặc paraphrase)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  const bySource = {};
  for (const m of weakMatch) {
    if (!bySource[m.bullet.source]) bySource[m.bullet.source] = [];
    bySource[m.bullet.source].push(m);
  }
  for (const [src, items] of Object.entries(bySource)) {
    console.log(`\n📂 [${src}] — ${items.length} weak matches:`);
    items.slice(0, 30).forEach((m, i) => {
      console.log(`  ${i + 1}. PDF: "${m.bullet.raw}"`);
      console.log(`     TS:  "${m.card?.front || "(no match)"}"  (score=${m.score.toFixed(2)})`);
    });
    if (items.length > 30) {
      console.log(`     ... và ${items.length - 30} weak matches nữa.`);
    }
  }
}
