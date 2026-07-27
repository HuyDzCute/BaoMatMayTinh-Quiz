// Phân tích chi tiết 132 từ trùng lặp Oxford 3000 - xem có cần dedup không
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./lib/oxford-3000-source.json", "utf8"));

// Build map: word -> [{topic, pos, ipa, meaning, idx}, ...]
const wordMap = new Map();
for (const t of data.topics) {
  for (let i = 0; i < t.cards.length; i++) {
    const c = t.cards[i];
    const key = c.word.toLowerCase().trim();
    if (!wordMap.has(key)) wordMap.set(key, []);
    wordMap.get(key).push({
      topic: t.index,
      topicName: t.name,
      pos: c.pos,
      ipa: c.ipa,
      meaning: c.meaning,
      idx: i,
    });
  }
}

const dupes = [...wordMap.entries()].filter(([k, v]) => v.length > 1);
console.log(`Total duplicate words: ${dupes.length}`);
console.log(`Total occurrences: ${dupes.reduce((s, [k, v]) => s + v.length, 0)}`);

let allSameMeaning = 0;
let sameMeaningDifferentPOS = 0;
let differentMeaning = 0;
let allSamePOS = 0;

const examples = { allSame: [], diffMeaning: [], samePOS: [] };

for (const [word, entries] of dupes) {
  const meanings = new Set(entries.map((e) => e.meaning));
  const pos = new Set(entries.map((e) => e.pos));
  if (meanings.size === 1) {
    allSameMeaning++;
    if (pos.size === 1) allSamePOS++;
    if (pos.size > 1) sameMeaningDifferentPOS++;
    if (examples.allSame.length < 10) {
      examples.allSame.push({ word, entries, meanings: [...meanings], pos: [...pos] });
    }
  } else {
    differentMeaning++;
    if (examples.diffMeaning.length < 15) {
      examples.diffMeaning.push({ word, entries });
    }
  }
}

console.log(`\nBreakdown:`);
console.log(`  All same meaning + same POS: ${allSamePOS}`);
console.log(`  Same meaning + different POS: ${sameMeaningDifferentPOS}`);
console.log(`  Different meanings: ${differentMeaning}`);

console.log(`\n=== Examples of words with different meanings (likely legitimate) ===`);
for (const ex of examples.diffMeaning) {
  console.log(`\n"${ex.word}":`);
  for (const e of ex.entries) {
    console.log(`  [T${e.topic} ${e.topicName}] ${e.pos} ${e.ipa} = ${e.meaning}`);
  }
}

console.log(`\n=== Examples of words with same meaning (pure duplicates) ===`);
for (const ex of examples.allSame) {
  console.log(`"${ex.word}" appears ${ex.entries.length} times, all meaning: "${ex.meanings[0]}"`);
}
