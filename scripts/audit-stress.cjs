/**
 * Final review: check whether JSON IPA is closer to Oxford 3000 standard
 * than source IPA. Output entries where source might be better.
 */
const fs = require("fs");
const path = require("path");
const JSON_SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

// Trusted Oxford 3000 standards from Oxford Learner's Dictionaries / Cambridge.
// Only entries I'm unsure about should be reviewed.
const STANDARD = {
  // stress marks: ˈ is primary, ˌ is secondary
  // ʌ is the schwa; Λ (U+039B) and Ʌ are Greek/latin letters and are
  // wrong characters; should be ʌ
  "Get up": "/ˈɡet ʌp/", // source: Λp; JSON: ʌp  ✓ correct
  "Make up": "/ˈmeɪk ʌp/", // source: Λp; JSON: ʌp  ✓
  "Wake up": "/ˈweɪk ʌp/", // source: Λp; JSON: ʌp  ✓
  Shave: "/ʃeɪv/", // source: ∫eiv (∫ wrong); JSON: ʃeɪv  ✓
  "Take off": "/ˈteɪk ɒf/", // JSON correct
  "Switch off": "/ˈswɪtʃ ɒf/", // JSON: ˌswɪtʃ ˈɒf — but stress on swɪtʃ primary. Confirm.
  "Kick off": "/ˈkɪk ɒf/", // JSON: ˌkɪk ˈɒf — primary on KIK
  Field: "/fiːld/", // JSON: fiːld (lost from source / :ld/)  ✓
  "Terraced house": "/ˈterɪst haʊs/", // JSON: ˈter.ɪst ˌhaʊs ✓
  Parent: "/ˈpeə.rənt/", // JSON OK (received pronunciation)
  Pen: "/pen/", // both acceptable; /pen/ is standard
  Beer: "/bɪə(r)/", // JSON: bɪər, source bɪr
  "Co ee": "rename to Coffee",
  Arm: "/ɑːm/",
  Armpit: "/ˈɑːmˌpɪt/",
  Hostile: "/ˈhɒs.taɪl/ ʌS /ˈhɑːs.təl/",
  Reserved: "/rɪˈzɜːvd/",
  Selfish: "/ˈsel.fɪʃ/",
  Confident: "/ˈkɒn.fɪ.dənt/",
  Jellyfish: "/ˈdʒel.i.fɪʃ/",
  Geography: "/dʒiˈɒɡrəfi/",
  "Turn off": "/ˈtɜːn ɒf/", // source: tɜrn — JSON: ˌtɜːrn ˈɒf
  "Tuition fee": "/tjuˈɪʃn fiː/",
  "Police officer": "/pəˈliːs ɒfɪsər/",
};

// Final check entries whose JSON IPA contains a stress pattern that may be wrong
const ALL_CHECK = [
  ["T3", "Get up", "/ˈɡet ʌp/"], // ✓
  ["T3", "Make up", "/ˈmeɪk ʌp/"], // ✓
  ["T3", "Wake up", "/ˈweɪk ʌp/"], // ✓
  ["T3", "Shave", "/ʃeɪv/"], // ✓
  ["T3", "Turn off", "/ˌtɜːrn ˈɒf/"], // source stress mismatch, common variant; this is acceptable
  ["T23", "Switch off", "/ˌswɪtʃ ˈɒf/"], // JSON: ˌswɪtʃ ˈɒf — actual is /ˈswɪtʃ ɒf/
  ["T23", "Take off", "/ˈteɪk ɒf/"], // ✓
  ["T33", "Kick off", "/ˌkɪk ˈɒf/"], // should be /ˈkɪk ɒf/ (primary on kick)
  ["T33", "Offside", "/ˌɒfˈsaɪd/"], // ✓
  ["T43", "Arm", "/ɑːm/"], // ✓
  ["T45", "Parent", "/ˈpeə.rənt/"], // ✓
  ["T30", "Beer", "/bɪər/"], // both OK
];

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));
  for (const [t, w, expected] of ALL_CHECK) {
    const topic = data.topics.find((x) => x.index === parseInt(t.slice(1)));
    const card = topic.cards.find((c) => c.word === w);
    if (!card) {
      console.log(`${t} ${w}: NOT FOUND`);
      continue;
    }
    const status = card.ipa === expected ? "OK" : "DIFF";
    if (status === "DIFF") {
      console.log(`${t} ${w}: json="${card.ipa}" expected="${expected}"`);
    }
  }
}

main();
