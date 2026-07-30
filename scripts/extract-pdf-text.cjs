#!/usr/bin/env node
/**
 * extract-pdf-text.cjs — Convert tất cả 20 PDF trong VOCABULARY - 2021/ sang text
 * Lưu vào scripts/pdf-text/ để dùng cho audit sau này.
 */

const fs = require("fs");
const path = require("path");

const PDF_DIR = "C:\\Users\\Administrator\\Downloads\\VOCABULARY - 2021\\";
const OUT_DIR = path.join(__dirname, "pdf-text");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

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
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  for (const f of files) {
    const outName = f.replace(/[^\w\-.]/g, "_").replace(/\.pdf$/, ".txt");
    try {
      await extractOne(pdfjs, path.join(PDF_DIR, f), outName);
    } catch (err) {
      console.error(`FAIL ${f}: ${err.message}`);
    }
  }
})();
