// Audit Paraphrasing files - check format, duplicates, typos
const fs = require("fs");

const cardRegex =
  /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*(["'])([\s\S]*?)\2\s*,\s*back:\s*(["'])([\s\S]*?)\4([\s\S]*?)\}/g;

const files = ["./lib/flashcards-paraphrasing.ts"];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log(`File not found: ${f}`);
    continue;
  }
  const src = fs.readFileSync(f, "utf8");
  const cards = [];
  let m;
  while ((m = cardRegex.exec(src)) !== null) {
    cards.push({
      id: m[1],
      front: m[3],
      back: m[5],
      rest: m[6],
    });
  }

  console.log(`\n=== ${f} ===`);
  console.log(`Total cards: ${cards.length}`);

  // Check for duplicates
  const idMap = new Map();
  const dupIds = [];
  for (const c of cards) {
    if (idMap.has(c.id)) {
      dupIds.push(c.id);
    } else {
      idMap.set(c.id, c);
    }
  }
  console.log(`Duplicate IDs: ${dupIds.length}`);
  if (dupIds.length > 0) {
    dupIds.slice(0, 10).forEach((id) => console.log(`  - ${id}`));
  }

  // Check empty fields
  let emptyFront = 0,
    emptyBack = 0;
  for (const c of cards) {
    if (!c.front.trim()) emptyFront++;
    if (!c.back.trim()) emptyBack++;
  }
  console.log(`Empty front: ${emptyFront}`);
  console.log(`Empty back: ${emptyBack}`);

  // Check IPA format for those that have pronunciation
  let pronCount = 0,
    badIPA = 0;
  const ipaRegex = /pronunciation:\s*["'](\/?[^"']*?)["']/g;
  let ipaMatch;
  while ((ipaMatch = ipaRegex.exec(src)) !== null) {
    const ipa = ipaMatch[1];
    pronCount++;
    if (ipa && !ipa.match(/^\/.+\/?$/)) {
      badIPA++;
    }
  }
  console.log(`Total pronunciation fields: ${pronCount}`);
  console.log(`Bad IPA format: ${badIPA}`);

  // Check for common typos
  const typoPatterns = [
    { pattern: /\bteh\b/, name: "teh (the)" },
    { pattern: /\bhte\b/, name: "hte (the)" },
    { pattern: /\bwiht\b/, name: "wiht (with)" },
    { pattern: /\bwhith\b/, name: "whith (with)" },
    { pattern: /\brecieve\b/, name: "recieve (receive)" },
    { pattern: /\boccured\b/, name: "occured (occurred)" },
    { pattern: /\bseperate\b/, name: "seperate (separate)" },
    { pattern: /\bdefinately\b/, name: "definately (definitely)" },
    { pattern: /\buntill\b/, name: "untill (until)" },
    { pattern: /\bbegining\b/, name: "begining (beginning)" },
  ];
  let typoCount = 0;
  for (const tp of typoPatterns) {
    const matches = src.match(tp.pattern);
    if (matches) {
      typoCount += matches.length;
      console.log(`  Typo "${tp.name}": ${matches.length} occurrences`);
    }
  }
  console.log(`Total typos: ${typoCount}`);

  // Cards by prefix
  const prefixCount = {};
  for (const c of cards) {
    const prefix = c.id.split("-")[0];
    prefixCount[prefix] = (prefixCount[prefix] || 0) + 1;
  }
  console.log(`Cards by id-prefix:`, prefixCount);
}
