/**
 * Add the genuinely missing entries that the parser dropped.
 */
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

// Each entry: [topicIndex, word, pos, ipa, meaning]
const ADD = [
  // T3: hoạt động thường ngày
  [3, "Do your homework", "v. phr", "/ˌduː jɔːr ˈhəʊm.wɜːk/", "Làm bài tập về nhà"],
  [3, "Take the rubbish out", "v. phr", "/ˌteɪk ðə ˈrʌb.ɪʃ ˈaʊt/", "Đi đổ rác"],

  // T6: mua sắm
  [6, "Refund", "n/v", "/ˈriː.fʌnd/", "Hoàn lại, trả lại"],

  // T24: sức khỏe
  [24, "High blood pressure", "n. phr", "/ˌhaɪ ˈblʌd ˈpreʃ.ər/", "Cao huyết áp"],
  [24, "Low blood pressure", "n. phr", "/ˌloʊ ˈblʌd ˈpreʃ.ər/", "Huyết áp thấp"],

  // T28: cảm xúc
  [28, "Surprised", "adj", "/səˈpraɪzd/", "Ngạc nhiên"],
  [28, "Nervous", "adj", "/ˈnɜː.vəs/", "Lo lắng"],
  [28, "Comfortable", "adj", "/ˈkʌm.fə.tə.bəl/", "Thoải mái"],

  // T39: trường học
  [39, "Secondary school", "n. phr", "/ˈsɛk.ən.dər.i skuːl/", "Trường trung học cơ sở"],

  // T44: giáo dục
  [44, "Secondary school", "n. phr", "/ˈsɛk.ən.dər.i skuːl/", "Trường trung học cơ sở"],

  // T60: ngân hàng
  [60, "Cost of borrowing", "n. phr", "/ˌkɒst əv ˈbɒr.oʊ.ɪŋ/", "Chi phí vay"],
];

function main() {
  const data = JSON.parse(fs.readFileSync(SRC, "utf8"));

  let addCount = 0;
  for (const [topicIdx, word, pos, ipa, meaning] of ADD) {
    const t = data.topics.find((t) => t.index === topicIdx);
    if (!t) {
      console.log(`Topic ${topicIdx} not found.`);
      continue;
    }
    // Skip if already present (case-insensitive)
    const exists = t.cards.find((c) => c.word.toLowerCase() === word.toLowerCase());
    if (exists) {
      console.log(`T${topicIdx} "${word}" already exists, skipping.`);
      continue;
    }
    t.cards.push({ word, pos, ipa, meaning });
    addCount++;
  }

  // Update total counts
  for (const t of data.topics) {
    // no derived count stored; nothing else to update
  }

  fs.writeFileSync(SRC, JSON.stringify(data, null, 2), "utf8");
  console.log(`\nAdded ${addCount} entries.`);

  // Print summary
  const total = data.topics.reduce((a, t) => a + t.cards.length, 0);
  console.log(`Total cards now: ${total}`);
}

main();
