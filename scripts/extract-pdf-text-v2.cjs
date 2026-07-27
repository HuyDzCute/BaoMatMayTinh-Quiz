#!/usr/bin/env node
/**
 * extract-pdf-text-v2.cjs — Phiên bản cải tiến: ghép text theo khoảng cách
 * để tránh bị split ký tự.
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

    // Group items thành "lines" theo Y, và ghép text theo X gap
    const items = content.items
      .filter((it) => it.str !== undefined && it.str !== "")
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
        h: it.height || 0,
      }));

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Tính mean height để detect "same line"
    const heights = items.map((i) => i.h).filter((h) => h > 0);
    const meanH = heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : 10;

    // Group items thành rows (cùng Y ± threshold)
    const rows = [];
    let currentRow = [];
    let lastY = null;
    for (const it of items) {
      if (lastY === null || Math.abs(it.y - lastY) < meanH * 0.6) {
        currentRow.push(it);
      } else {
        rows.push(currentRow);
        currentRow = [it];
      }
      lastY = it.y;
    }
    if (currentRow.length) rows.push(currentRow);

    // Sort rows by Y descending (top to bottom)
    rows.sort((a, b) => b[0].y - a[0].y);

    // Sort items trong mỗi row theo X
    for (const row of rows) row.sort((a, b) => a.x - b.x);

    // Build text: với mỗi row, ghép items dựa trên khoảng cách X
    for (const row of rows) {
      let line = "";
      let lastEndX = null;
      for (const it of row) {
        if (lastEndX !== null) {
          const gap = it.x - lastEndX;
          // Khoảng cách nhỏ = cùng từ (do PDF rendering),
          // khoảng cách lớn = separator
          if (gap > it.h * 0.3) {
            line += " ";
          } else if (gap < -it.h * 0.1) {
            // Items overlap → ghép không cần space
          } else {
            line += "";
          }
        }
        line += it.str;
        lastEndX = it.x + (it.w || it.str.length * (it.h * 0.5));
      }
      allText += line + "\n";
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
