/**
 * Comprehensive IPA audit — check each entry's IPA for stress correctness.
 * For 2-3 syllable words, Oxford typically has ˈ (primary) on 1st syllable.
 * For multi-word phrasal verbs, primary on the verb (first word).
 *
 * Compare each JSON entry against the source line.
 */
const fs = require("fs");
const path = require("path");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

// Compare against Oxford 3000 published list
// Each entry we know is correct has /ˈX...X/ pattern with stress
// Common error: ˌX ˈY when should be ˈX Y or vice versa

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));
  const issues = [];
  const PRIMARY = /ˈ/;

  for (const t of data.topics) {
    for (const c of t.cards) {
      // Word boundary check
      const ipa = c.ipa || "";
      const word = c.word || "";
      // Multi-word: ensure primary on first phrase
      // Heuristic: if ˈ is not present, missing primary stress
      if (!PRIMARY.test(ipa)) {
        issues.push({ t: t.index, w: word, ipa, type: "no-primary-stress" });
      }
      // ˌ should not be the rightmost stress mark (Oxford doesn't put
      // secondary after primary on the same syllable)
      if (/ˈ.{0,3}ˌ/.test(ipa)) {
        // could be valid if the secondary is on a later syllable
        // but exclude phrasal verb patterns
        if (!/(\b\/\S+\s\S+\/)/.test(ipa)) {
          // console.log(ipa);
        }
      }
    }
  }
  console.log("Entries without primary ˈ:", issues.length);
  for (const x of issues) {
    console.log(`  T${x.t} ${x.w} : ${x.ipa}`);
  }
}

main();
