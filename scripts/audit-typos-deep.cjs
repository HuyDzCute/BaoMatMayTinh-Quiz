// Final comprehensive audit - check all 14 IELTS vocab files for typos + IPA issues
const fs = require("fs");

const files = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(
  (n) => "./lib/flashcards-ielts-vocab-" + n + ".ts",
);

const typoPatterns = [
  { pattern: /\bteh\b/, name: "teh (the)" },
  { pattern: /\bhti\b/, name: "hti (the)" },
  { pattern: /\bwiht\b/, name: "wiht (with)" },
  { pattern: /\bwhith\b/, name: "whith (with)" },
  { pattern: /\brecieve\b/, name: "recieve (receive)" },
  { pattern: /\boccured\b/, name: "occured (occurred)" },
  { pattern: /\bseperate\b/, name: "seperate (separate)" },
  { pattern: /\bdefinately\b/, name: "definately (definitely)" },
  { pattern: /\buntill\b/, name: "untill (until)" },
  { pattern: /\bbegining\b/, name: "begining (beginning)" },
  { pattern: /\baccross\b/, name: "accross (across)" },
  { pattern: /\bcomming\b/, name: "comming (coming)" },
  { pattern: /\bdurring\b/, name: "durring (during)" },
  { pattern: /\bequip ment\b/, name: "equip ment (equipment)" },
  { pattern: /\bbenifit\b/, name: "benifit (benefit)" },
  { pattern: /\bneccessary\b/, name: "neccessary (necessary)" },
  { pattern: /\bgramar\b/, name: "gramar (grammar)" },
  { pattern: /\bpronounciation\b/, name: "pronounciation (pronunciation)" },
  { pattern: /\bconcious\b/, name: "concious (conscious)" },
  { pattern: /\bharras\b/, name: "harras (harass)" },
  { pattern: /\bembarass\b/, name: "embarass (embarrass)" },
  { pattern: /\bexistance\b/, name: "existance (existence)" },
];

let totalIssues = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");

  // Check for typos in front (English) and back (Vietnamese) - but front should be English
  // Typos in back (Vietnamese) we don't care - only English typos
  const cardRegex =
    /\{\s*id:\s*["']([^"']+)["'],\s*front:\s*(["'])([\s\S]*?)\2\s*,\s*back:\s*(["'])([\s\S]*?)\4[\s\S]*?\}/g;
  let m;
  let fileIssues = 0;
  while ((m = cardRegex.exec(src)) !== null) {
    const id = m[1];
    const front = m[3];
    const back = m[5];

    // Only check English typos in front
    const frontText = front.toLowerCase();
    for (const tp of typoPatterns) {
      if (tp.pattern.test(frontText)) {
        console.log(`⚠️  ${f} - ${id}: "${tp.name}" in front: "${front.substring(0, 80)}"`);
        fileIssues++;
      }
    }

    // Check IPA on the original full match (m[0])
    const ipaRegex = /pronunciation:\s*["']([^"']*?)["']/;
    const ipaMatch = m[0].match(ipaRegex);
    if (ipaMatch) {
      const ipa = ipaMatch[1];
      // IPA should start with / and end with / (when non-empty)
      if (ipa && !ipa.match(/^\/.*\/?$/)) {
        console.log(`⚠️  ${f} - ${id}: bad IPA "${ipa}"`);
        fileIssues++;
      }
    }
  }
  if (fileIssues > 0) {
    console.log(`  ${f}: ${fileIssues} issues`);
    totalIssues += fileIssues;
  }
}
console.log(`\nTotal issues: ${totalIssues}`);
