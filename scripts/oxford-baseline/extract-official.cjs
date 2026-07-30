// Extract official Oxford 3000 word list from downloaded PDF text
const fs = require("fs");
const path = require("path");

const txt = fs.readFileSync(path.join(__dirname, "oxford-source.txt"), "utf8");

// Parse each line that looks like a word entry: "word pos. level"
const lines = txt.split("\n");
const set = new Set();
const words = [];

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  // Match word part. Format: "<word> pos. level" where pos is n./v./adj./adv./prep./conj./pron./det./exclam./number/auxiliary/modal
  // We try: word at the start, then a part-of-speech token, then a CEFR level
  const m = line.match(
    /^([a-zA-Z][a-zA-Z0-9\s\.\-_']*?)\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|det\.|exclam\.|number|auxiliary\s+v\.|modal\s+v\.)/,
  );
  if (m) {
    const word = m[1].trim().toLowerCase();
    if (!set.has(word)) {
      set.add(word);
      words.push({ word, raw: line });
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, "official-3000.txt"),
  words.map((w) => w.word).join("\n") + "\n",
);

console.log(`Total unique Oxford 3000 words parsed: ${words.length}`);
console.log(
  "First 5:",
  words
    .slice(0, 5)
    .map((w) => w.word)
    .join(", "),
);
console.log(
  "Last 5:",
  words
    .slice(-5)
    .map((w) => w.word)
    .join(", "),
);
