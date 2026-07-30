// Extract bullets từ các PDF text files mới và merge vào pdf-vocab-detail.json
const fs = require("fs");
const path = require("path");

// Mapping: tên file PDF text -> topic name trong JSON
const NEW_PDFS = {
  "tu-vung-ielts---chu-de-air-pollution.txt": "Air Pollution",
  "tu-vung-ielts---chu-de-animal-extinction.txt": "Animal Extinction",
  "tu-vung-ielts---chu-de-animal-testing.txt": "Animal Testing",
  "tu-vung-ielts---chu-de-animals.txt": "Animals",
  "tu-vung-ielts---chu-de-artificial-intelligence.txt": "Artificial Intelligence",
  "tu-vung-ielts---chu-de-average-life-expectancy.txt": "Average Life Expectancy",
  "tu-vung-ielts---chu-de-business-and-money---ielts-nguyenhuyen.txt": "Business and Money",
  "tu-vung-ielts---chu-de-city-life---ielts-nguyenhuyen.txt": "City Life",
  "tu-vung-ielts---chu-de-crime---ielts-nguyenhuyen.txt": "Crime (new)",
  "tu-vung-ielts---chu-de-culture---ielts-nguyenhuyen.txt": "Culture",
  "tu-vung-ielts---chu-de-education---ielts-nguyenhuyen.txt": "Education (new)",
  "tu-vung-ielts---chu-de-energy---ielts-nguyenhuyen.txt": "Energy",
  "tu-vung-ielts---chu-de-environment---ielts-nguyenhuyen.txt": "Environment (new)",
  "tu-vung-ielts---chu-de-family-_-children---ielts-nguyenhuyen.txt": "Family & Children (new)",
  "tu-vung-ielts---chu-de-foreign-aid.txt": "Foreign Aid",
  "tu-vung-ielts---chu-de-government-spending---ielts-nguyenhuyen.txt": "Government Spending",
  "tu-vung-ielts---chu-de-health---ielts-nguyenhuyen.txt": "Health",
  "tu-vung-ielts---chu-de-housing-and-architecture---ielts-nguyenhuyen.txt":
    "Housing and Architecture",
  "tu-vung-ielts---chu-de-languages.txt": "Languages (new)",
  "tu-vung-ielts---chu-de-stress.txt": "Stress",
  "tu-vung-ielts---chu-de-technology---ielts-nguyenhuyen.txt": "Technology (new)",
  "tu-vung-ielts---chu-de-throwaway-society---ielts-nguyenhuyen.txt": "Throwaway Society",
  "tu-vung-ielts---chu-de-tourism---ielts-nguyenhuyen.txt": "Tourism",
  "tu-vung-ielts---chu-de-transport---ielts-nguyenhuyen.txt": "Transport",
  "tu-vung-ielts---chu-de-water-pollution.txt": "Water Pollution",
  "tu-vung-ielts---chu-de-work---ielts-nguyenhuyen.txt": "Work (new)",
  "tu-vung-ielts---chu-de-world-hunger.txt": "World Hunger",
  "tu-vung-ielts---chu-de-wrorking-from-home---ielts-nguyenhuyen.txt": "Working from Home",
  "tu-vung-ielts-chu-de-ageing-population---ielts-nguyenhuyen.txt": "Ageing Population",
  "tu-vung-ielts-chu-de-christmas---ielts-nguyenhuyen.txt": "Christmas",
  "tu-vung-ielts-chu-de-family-structure-and-family-roles---ielts-nguyenhuyen.txt":
    "Family Structure and Roles",
  "tu-vung-ielts-chu-de-genetically-modified-foods---ielts-nguyenhuyen.txt": "GM Foods",
  "tu-vung-ielts-chu-de-overpopulation---ielts-nguyenhuyen.txt": "Overpopulation",
  "tu-vung-ielts-chu-de-sport-and-exercise---ielts-nguyenhuyen.txt": "Sport and Exercise",
  "tu-vung-ielts-chu-de-tet-holiday---ielts-nguyenhuyen.txt": "Tet Holiday",
  "tu-vung-ielts-chu-de-the-gap-between-rich-and-poor---ielts-nguyenhuyen-(1).txt":
    "Gap Between Rich and Poor",
  "tu-vung---chu-de-daily-routines.txt": "Daily Routines (new)",
};

const PDF_DIR = path.join(__dirname, "pdf-text");
const OUT_JSON = path.join(__dirname, "pdf-vocab-detail.json");

// Đọc JSON cũ
const existing = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));

const extracted = {};

// Đơn giản: extract mỗi dòng làm 1 bullet (đủ tốt cho audit comparison)
for (const [fname, topic] of Object.entries(NEW_PDFS)) {
  const fp = path.join(PDF_DIR, fname);
  if (!fs.existsSync(fp)) {
    console.log(`Skip (not found): ${fname}`);
    continue;
  }
  const src = fs.readFileSync(fp, "utf8");
  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 5 && !l.includes("END PAGE") && !l.startsWith("===") && !/^[A-Z\s]{3,}$/.test(l), // skip headers
    );
  extracted[fname] = lines;
  console.log(`${topic}: ${lines.length} lines extracted`);
}

// Merge với existing (existing có quyền ưu tiên)
const merged = { ...extracted, ...existing };

fs.writeFileSync(OUT_JSON, JSON.stringify(merged, null, 2), "utf8");
console.log(`\nMerged JSON saved with ${Object.keys(merged).length} files total.`);
