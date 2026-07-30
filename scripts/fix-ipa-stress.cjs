/**
 * Fix known IPA errors per Oxford / Cambridge standard.
 *
 * Modifying entries where JSON IPA has stray ˌ or ˈ that don't match
 * the Oxford 3000 standard IPA or where source is clearly better.
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

// Each entry: [topicIndex, word, partial new fields]
const FIXES = [
  // Fix compound verb stress: primary on the first word
  [3, "Turn off", { ipa: "/ˈtɜːn ɒf/" }],
  [13, "Rush", { ipa: "/ˈrʌʃ/" }], // Rush as verb
  [23, "Switch off", { ipa: "/ˈswɪtʃ ɒf/" }],
  [23, "Take off", { ipa: "/ˈteɪk ɒf/" }],
  [33, "Kick off", { ipa: "/ˈkɪk ɒf/" }],
];

function main() {
  const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
  let count = 0;
  for (const [ti, w, fields] of FIXES) {
    const t = data.topics.find((t) => t.index === ti);
    if (!t) {
      console.log(`Topic ${ti} not found`);
      continue;
    }
    const c = t.cards.find((c) => c.word === w);
    if (!c) {
      console.log(`T${ti} ${w} not found`);
      continue;
    }
    for (const [k, v] of Object.entries(fields)) c[k] = v;
    count++;
  }
  fs.writeFileSync(SRC, JSON.stringify(data, null, 2), "utf8");
  console.log(`Fixed ${count} IPA entries.`);
}

main();
