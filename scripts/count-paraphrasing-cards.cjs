const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "lib", "flashcards-paraphrasing.ts");
const src = fs.readFileSync(file, "utf8");

// Count cards by type for each set
const setRegex =
  /(?:^|\n)(?:const|let|var)\s+(\w+Cards)\s*:\s*Flashcard\[\]\s*=\s*\[([\s\S]*?)\];/g;
const setNames = {
  cityLifeCards: "City Life",
  crimeCards: "Crime",
  educationCards: "Education",
  environmentCards: "Environment",
  familyCards: "Family & Children",
  healthCards: "Health",
  tourismCards: "Tourism",
  transportCards: "Transport",
  workCards: "Work",
};

let totalAll = 0;
const summary = [];

for (const m of src.matchAll(setRegex)) {
  const varName = m[1];
  const body = m[2];
  const name = setNames[varName] || varName;
  const vocab = (body.match(/id:\s*"vocab-/g) || []).length;
  const para = (body.match(/id:\s*"para-/g) || []).length;
  const idiom = (body.match(/id:\s*"idiom-/g) || []).length;
  const example = (body.match(/id:\s*"example-/g) || []).length;
  const total = vocab + para + idiom + example;
  totalAll += total;
  summary.push({ name, vocab, para, idiom, example, total });
}

console.log("=== Per-set card counts ===");
console.table(summary);
console.log("TOTAL across all sets:", totalAll);
