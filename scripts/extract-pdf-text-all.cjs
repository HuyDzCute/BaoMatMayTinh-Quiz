#!/usr/bin/env node
/**
 * extract-pdf-text-all.cjs — Convert tất cả PDF trong folder gốc sang text
 * Path: C:\Users\Administrator\Downloads\Vocabulary - ielts-nguyenhuyen\
 */
const fs = require("fs");
const path = require("path");

const PDF_DIR = "C:\\Users\\Administrator\\Downloads\\Vocabulary - ielts-nguyenhuyen";
const OUT_DIR = path.join(__dirname, "pdf-text");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Sửa ký tự đặc biệt trong tên file
function safeName(name) {
  return name
    .replace(/[đĐ]/g, "d")
    .replace(/[éèêẹẽếề]/g, "e")
    .replace(/[áàảạãâấầậẫ]/g, "a")
    .replace(/[íìịĩ]/g, "i")
    .replace(/[óòỏọõôốồộỗơớờợở]/g, "o")
    .replace(/[úùủụũưứừửữự]/g, "u")
    .replace(/[ýỳỷỹỵ]/g, "y")
    .replace(/[^\w\-.\(\) ]/g, "_")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/\.pdf$/, ".txt");
}

async function extractOne(pdfjs, pdfPath, outName) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;
  let allText = "";

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => it.str !== undefined && it.str !== "")
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
      }));

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    let lines = [];
    let currentLine = [];
    let lastY = null;
    for (const it of items) {
      if (lastY === null || Math.abs(it.y - lastY) < 5) {
        currentLine.push(it);
      } else {
        lines.push(currentLine);
        currentLine = [it];
      }
      lastY = it.y;
    }
    if (currentLine.length) lines.push(currentLine);

    for (const line of lines) line.sort((a, b) => a.x - b.x);

    for (const line of lines) {
      let row = "";
      let lastX = null;
      for (const it of line) {
        if (lastX !== null) {
          const gap = it.x - lastX;
          if (gap > 5) row += " ";
        }
        row += it.str;
        lastX = it.x + it.str.length * 3;
      }
      allText += row + "\n";
    }
    allText += "\n=== END PAGE " + p + " ===\n";
  }

  fs.writeFileSync(path.join(OUT_DIR, outName), allText, "utf8");
  console.log(`OK ${outName} (${allText.length} chars)`);
}

(async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!fs.existsSync(PDF_DIR)) {
    console.error(`Folder not found: ${PDF_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDFs`);

  // Skip PDFs đã có (English → trùng ielts folder)
  const skipPrefixes = ["tu-vung-ielts", "tuvung", "kinh", "ebook", "nguon", "bbc"];

  for (const f of files) {
    // Dedup cho 3 file trùng tên
    let outName = safeName(f);
    const outPath = path.join(OUT_DIR, outName);
    if (fs.existsSync(outPath)) {
      console.log(`SKIP ${outName} (already exists)`);
      continue;
    }
    try {
      await extractOne(pdfjs, path.join(PDF_DIR, f), outName);
    } catch (err) {
      console.error(`FAIL ${f}: ${err.message}`);
    }
  }
})();
