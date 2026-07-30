const fs = require("fs");
const t = fs.readFileSync("lib/flashcards-paraphrasing.ts", "utf8");

console.log("=== Re-audit of high-priority issues ===\n");

const checks = [
  // City
  ["city", "vocab-city-6", "thấy khó khăn"],
  ["city", "para-city-4", "urban sprawl", false], // should NOT have urban sprawl
  ["city", "para-city-8", "rural depopulation", false],
  // Crime
  ["crime", "vocab-crime-8", "a prison sentence"], // singular
  ["crime", "vocab-crime-12", "một cách"],
  ["crime", "vocab-crime-16", "răn đe"],
  ["crime", "para-crime-9", "vị thành niên"],
  ["crime", "para-crime-16", "serious problem"],
  ["crime", "para-crime-17", "rising levels"],
  ["crime", "para-crime-19", "lý do"],
  // Education
  ["edu", "vocab-edu-1", "cao hơn"],
  ["edu", "vocab-edu-4", "kết quả giáo dục"],
  ["edu", "vocab-edu-7", "đỗ"],
  ["edu", "para-edu-8", "tiếp tục học lên"],
  ["edu", "para-edu-11", "develop problem-solving"],
  // Environment
  ["env", "vocab-env-11", "avoid investing"],
  ["env", "vocab-env-15", "carbon dioxide"],
  ["env", "vocab-env-17", "hành động vì"],
  ["env", "vocab-env-18", "the greenhouse effect"],
  ["env", "para-env-5", "toxic gases", false],
  ["env", "para-env-8", "large-scale"],
  ["env", "para-env-10", "to be significant"],
  ["env", "example-env-5", "Effectively addressing"],
  // Family
  ["fam", "vocab-fam-10", "ít vận động"],
  ["fam", "vocab-fam-18", "khiến con"],
  ["fam", "vocab-fam-23", "to become pregnant"],
  ["fam", "para-fam-6", "sinh con muộn"],
  // Health
  ["health", "vocab-health-5", "một chế độ"],
  ["health", "vocab-health-6", "một chế độ"],
  ["health", "vocab-health-17", "nguy cơ mắc"],
  ["health", "vocab-health-20", "sự phổ biến"],
  ["health", "idiom-health-3", "out of sorts"],
  ["health", "idiom-health-9", "to lose consciousness"],
  ["health", "para-health-9", "tham gia các hoạt động"],
  // Tourism
  ["tour", "vocab-tour-2", "sightseeing"],
  ["tour", "vocab-tour-12", "chi phí sinh hoạt"],
  ["tour", "vocab-tour-15", "sự mai một"],
  ["tour", "vocab-tour-17", "most popular"],
  ["tour", "vocab-tour-19", "boost the economy"],
  ["tour", "vocab-tour-27", "giấy tờ tùy thân"],
  ["tour", "vocab-tour-29", "một mình"],
  ["tour", "para-tour-2", "commercial travel"],
  ["tour", "para-tour-18", "budget airline"],
  ["tour", "para-tour-19", "nhà hàng"],
  // Transport
  ["trans", "vocab-trans-3", "liều lĩnh"],
  ["trans", "vocab-trans-7", "mũ bảo hiểm"],
  ["trans", "vocab-trans-13", "dưới ảnh hưởng"],
  ["trans", "vocab-trans-21", "chỗ đỗ xe"],
  ["trans", "para-trans-6", "poor driving habits"],
  ["trans", "para-trans-8", "autonomous cars"],
  // Work
  ["work", "vocab-work-6", "một công việc"],
  ["work", "vocab-work-13", "một ví dụ"],
  ["work", "vocab-work-20", "gain experience"],
  ["work", "vocab-work-27", "bị cô lập"],
  ["work", "vocab-work-28", "dễ bị sao nhãng"],
  ["work", "vocab-work-31", "find it difficult"],
  ["work", "para-work-10", "buồn chán"],
  ["work", "para-work-11", "đảm nhận"],
  ["work", "para-work-15", "rèn luyện"],
  ["work", "para-work-18", "unemployment levels"],
  ["work", "para-work-19", "are unemployed"],
];

let pass = 0,
  fail = 0;
checks.forEach(([topic, id, expected, shouldContain = true]) => {
  const idPattern = new RegExp(
    `id: "${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"[\\s\\S]*?(?=id: |\\}])`,
  );
  const m = t.match(idPattern);
  if (!m) {
    console.log(`✗ ${id}: not found`);
    fail++;
    return;
  }
  const cardText = m[0];
  const contains = cardText.includes(expected);
  const ok = shouldContain ? contains : !contains;
  if (ok) {
    console.log(`✓ ${id}: ${shouldContain ? "has" : "no"} "${expected}"`);
    pass++;
  } else {
    console.log(`✗ ${id}: expected ${shouldContain ? "" : "no "}"${expected}"`);
    fail++;
  }
});

console.log(`\n${pass}/${checks.length} checks passed (${fail} failed)`);
