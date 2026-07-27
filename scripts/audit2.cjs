/**
 * Final-stage audit, v2: tighter regex.
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

function main() {
  const data = JSON.parse(fs.readFileSync(SRC, "utf8"));

  const issues = [];
  const SMART = /[‘’]/;

  for (const t of data.topics) {
    for (const c of t.cards) {
      const flag = [];
      if (SMART.test(c.ipa)) flag.push("ipa-smart-quote");
      if (SMART.test(c.meaning)) flag.push("meaning-smart-quote");
      if (SMART.test(c.word)) flag.push("word-smart-quote");
      if (c.ipa && !c.ipa.startsWith("/")) flag.push("ipa-no-leading-slash");
      // IPA should have matching pairs
      const opens = (c.ipa.match(/\//g) || []).length;
      if (opens !== 2 && opens !== 4 && opens !== 6) {
        flag.push("ipa-odd-slash-count," + opens);
      }
      // Word starting with single letter followed by space and letter (rare)
      if (/\bo\b/.test(c.word)) flag.push("word-only-o");
      if (/  +/.test(c.word)) flag.push("word-double-space");
      if (/  +/.test(c.meaning)) flag.push("meaning-double-space");
      if (flag.length) {
        issues.push({
          topic: t.index,
          word: c.word,
          ipa: c.ipa,
          meaning: c.meaning,
          problems: flag,
        });
      }
    }
  }

  console.log("Found", issues.length, "issues.");
  for (const x of issues) {
    console.log(
      `T${x.topic} ${JSON.stringify(x.word)} [${x.problems.join(", ")}] ipa=${x.ipa} | ${x.meaning}`,
    );
  }
}

main();
