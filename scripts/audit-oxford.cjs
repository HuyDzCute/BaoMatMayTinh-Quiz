// Audit Oxford 3000 source JSON
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./lib/oxford-3000-source.json", "utf8"));

console.log("=== Oxford 3000 Audit ===\n");
console.log("Topics:", data.topics.length);

let totalCards = 0;
let emptyWord = 0,
  emptyMeaning = 0,
  emptyIPA = 0;
let badIPA = 0,
  suspiciousWord = 0;
let totalID = 0;
let duplicates = new Map();
let shortMeaningIssues = 0;
let longMeaningIssues = 0;

// Suffixes/phrases/typos patterns
const suspicious = [
  // english in meaning
  { regex: /\bthe\b|\band\b|\bor\b|\bto be\b|\bof\b/i, type: "english-in-meaning" },
  // missing diacritics in Vietnamese
  { regex: /^[a-zA-Z\s]+$/, type: "no-vietnamese", notFor: ["word"] },
];

for (const t of data.topics) {
  for (let i = 0; i < t.cards.length; i++) {
    const c = t.cards[i];
    totalCards++;
    const id = `oxford-${t.index}-${i}`;
    if (duplicates.has(c.word)) {
      duplicates.set(c.word, duplicates.get(c.word) + 1);
    } else {
      duplicates.set(c.word, 1);
    }
    if (!c.word || !c.word.trim()) emptyWord++;
    if (!c.meaning || !c.meaning.trim()) emptyMeaning++;
    if (!c.ipa || !c.ipa.trim()) {
      emptyIPA++;
      if (totalID < 20) console.log(`  empty IPA: ${c.word} (topic ${t.index})`);
    } else if (!c.ipa.match(/^\/.+\/$/)) {
      badIPA++;
      if (totalID < 20) console.log(`  bad IPA: "${c.ipa}" for ${c.word}`);
    }
    totalID++;
    // Check Vietnamese meaning - should not be empty or pure English
    if (c.meaning) {
      // English words in meaning (other than technical terms)
      const englishWords = c.meaning.match(/\b[a-z]{4,}\b/g) || [];
      if (englishWords.length > 2) {
        // Might be a paraphrase with English words
      }
      if (c.meaning.length < 2) shortMeaningIssues++;
      if (c.meaning.length > 200) longMeaningIssues++;
    }
  }
}

console.log(`Total cards: ${totalCards}`);
console.log(`Empty word: ${emptyWord}`);
console.log(`Empty meaning: ${emptyMeaning}`);
console.log(`Empty IPA: ${emptyIPA}`);
console.log(`Bad IPA: ${badIPA}`);
console.log(`Short meaning: ${shortMeaningIssues}`);
console.log(`Long meaning: ${longMeaningIssues}`);

// Find duplicate words
const dupWords = [...duplicates.entries()].filter(([k, v]) => v > 1);
console.log(`\nDuplicate words across topics: ${dupWords.length}`);
dupWords.slice(0, 20).forEach(([w, n]) => console.log(`  "${w}": ${n} times`));

// Find cards with IPA missing
let noIPACount = 0;
for (const t of data.topics) {
  for (const c of t.cards) {
    if (!c.ipa || !c.ipa.trim()) noIPACount++;
  }
}
console.log(`\nCards without IPA: ${noIPACount}/${totalCards}`);
