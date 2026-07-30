// Manual check cho những từ tôi thấy còn thiếu trong các file
const fs = require("fs");
const files = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(
  (n) => "./lib/flashcards-ielts-vocab-" + n + ".ts",
);

// Tổng hợp những từ tôi thấy thiếu qua manual review
const missingToCheck = [
  // Family (TS2) - line 12 PDF: "to get married"
  { ts: 2, expected: "to get married", file: "Family" },
  // Family - line 36 PDF: "account for something"
  { ts: 2, expected: "account for something", file: "Family" },
  // Education (TS5) - PDF
  { ts: 5, expected: "to learn a wide range of skills", file: "Education" },
  { ts: 5, expected: "nursery school", file: "Education" },
  { ts: 5, expected: "to face culture shock", file: "Education study abroad" },
  { ts: 5, expected: "to do a part-time job", file: "Education study abroad" },
  { ts: 5, expected: "to favour A over B", file: "Education study abroad" },
  { ts: 5, expected: "stress management", file: "Education study abroad" },
  { ts: 5, expected: "problem-solving skills", file: "Education study abroad" },
  { ts: 5, expected: "to learn invaluable life lessons", file: "Education study abroad" },
  { ts: 5, expected: "homesickness", file: "Education study abroad" },
  { ts: 5, expected: "feelings of frustration", file: "Education study abroad" },
  { ts: 5, expected: "to make new friends", file: "Education study abroad" },
  { ts: 5, expected: "to experience a different way of living", file: "Education study abroad" },
  {
    ts: 5,
    expected: "Living on your own makes you more independent",
    file: "Education study abroad",
  },
  // Crime (TS3)
  { ts: 3, expected: "to commit crimes as a way of making a living", file: "Crime" },
  { ts: 3, expected: "a sense of safety and security", file: "Crime" },
  { ts: 3, expected: "crime prevention programmes", file: "Crime" },
  // Family Structure (TS13)
  { ts: 13, expected: "spend most of their time working", file: "Family Structure" },
  { ts: 13, expected: "have little time for their family", file: "Family Structure" },
  { ts: 13, expected: "have the chance to pursue their own career", file: "Family Structure" },
  { ts: 13, expected: "to cope with the high cost of living", file: "Family Structure" },
  { ts: 13, expected: "same-sex marriage", file: "Family Structure" },
  // Air Pollution (TS10)
  { ts: 10, expected: "mining operations", file: "Air Pollution" },
  { ts: 10, expected: "landfills", file: "Air Pollution" },
  // Tet Holiday (TS12)
  { ts: 12, expected: "prepare a special meal", file: "Tet Holiday" },
  { ts: 12, expected: "visit their grandparents", file: "Tet Holiday" },
  { ts: 12, expected: "give my best wishes", file: "Tet Holiday" },
  // Sport (TS12)
  { ts: 12, expected: "to spend more time engaging in physical activities", file: "Sport" },
  // Makeup (TS6) - đã cover
  // Air Pollution (TS10)
  { ts: 10, expected: "death", file: "Air Pollution" },
  // Throwaway (TS13)
  { ts: 13, expected: "repeat customers", file: "Throwaway" },
  { ts: 13, expected: "disposable products", file: "Throwaway" },
  { ts: 13, expected: "have a negative/detrimental/harmful effect on", file: "Throwaway" },
  // Government Spending (TS11)
  { ts: 11, expected: "government incentives", file: "Government Spending" },
  { ts: 11, expected: "research spending", file: "Government Spending" },
  { ts: 11, expected: "government spending categories", file: "Government Spending" },
  { ts: 11, expected: "financial resources", file: "Government Spending" },
  // Transport (TS12)
  { ts: 12, expected: "licence suspension", file: "Transport" },
  { ts: 12, expected: "speeding", file: "Transport" },
  { ts: 12, expected: "to impose stricter punishments on sb", file: "Transport" },
  { ts: 12, expected: "dangerous drivers", file: "Transport" },
  { ts: 12, expected: "to be encouraged to", file: "Transport" },
  // Housing (TS12)
  { ts: 12, expected: "high-quality/low-quality materials", file: "Housing" },
  { ts: 12, expected: "to be an integral part of", file: "Housing" },
  { ts: 12, expected: "iconic buildings", file: "Housing" },
  { ts: 12, expected: "energy-efficient homes", file: "Housing" },
  // AI (TS11)
  { ts: 11, expected: "enhance our efficiency", file: "AI" },
  { ts: 11, expected: "an AI arms race", file: "AI" },
  { ts: 11, expected: "be programmed to do s.th devastating", file: "AI" },
  // Stress (TS11)
  { ts: 11, expected: "shield sb from sth", file: "Stress" },
  { ts: 11, expected: "fail to do sth", file: "Stress" },
  { ts: 11, expected: "overcome life's challenges", file: "Stress" },
];

const result = {};
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8").toLowerCase();
  result[f] = src;
}

console.log("=== Missing words check ===");
let totalMissing = 0;
for (const m of missingToCheck) {
  const file = `./lib/flashcards-ielts-vocab-${m.ts}.ts`;
  if (!result[file]) {
    console.log(`❌ ${m.file}: ${m.expected} (file not found)`);
    continue;
  }
  // Extract the main keyword
  const keyword = m.expected.toLowerCase().split(" ").slice(0, 3).join(" ");
  if (!result[file].includes(keyword)) {
    console.log(`⚠️  ${m.file}: ${m.expected}`);
    totalMissing++;
  } else {
    console.log(`✅ ${m.file}: ${m.expected}`);
  }
}
console.log(`\nTotal missing: ${totalMissing}`);
