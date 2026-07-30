/**
 * Hand-fix known corrupted entries in the Oxford 3000 source.
 *
 * Many of these come from the PDF renderer's font artifact: the letter
 * `f` in certain positions drops out, leaving e.g. "Staff movements"
 * → "Sta movements", "Back-office" → "Back-o ce", "Suffer" → "Suer".
 * Others are OCR mistakes where two adjacent entries got merged.
 *
 * The fix list below is curated by auditing the parsed JSON against
 * the canonical Oxford 3000 wordlist.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..", "lib", "oxford-3000-source.json");

// Each fix is a tuple: [topicIndex, oldWord, newFields]
// newFields may be a partial object; only specified keys are updated.
const FIXES = [
  // --- Topic 13 (bệnh viện) ---
  [13, "Suer", { word: "Suffer", ipa: "/ˈsʌf.ər/", meaning: "Chịu đựng" }],

  // --- Topic 24 (sức khỏe) ---
  [24, "Fever", { ipa: "/ˈfiː.vər/" }],
  [24, "Snile", { word: "Sniff", ipa: "/snɪf/", meaning: "Hít, hắt hơi (bằng mũi)" }],
  [24, "Sore eyes", { ipa: "/sɔːr aɪz/" }],
  [24, "Earache", { ipa: "/ˈɪə.reɪk/" }],
  [24, "Nausea", { ipa: "/ˈnɔː.zi.ə/" }],
  [24, "Fever virus", { word: "Viral fever", ipa: "/ˈvaɪə.rəl ˈfiː.vər/", meaning: "Sốt siêu vi" }],
  [24, "Infected", { ipa: "/ɪnˈfek.tɪd/", pos: "adj", meaning: "Bị nhiễm trùng" }],
  [24, "Backache", { ipa: "/ˈbæk.eɪk/" }],
  [24, "Diabetes", { ipa: "/ˌdaɪ.əˈbiː.tiːz/" }],

  // --- Topic 33 (bóng đá) ---
  [33, "Kick o", { word: "Kick off", ipa: "/ˌkɪk ˈɒf/", meaning: "Bắt đầu, lăn bóng" }],
  [33, "Oside", { word: "Offside", ipa: "/ˌɒfˈsaɪd/", meaning: "Việt vị" }],
  [33, "Corner flag", { ipa: "/ˈkɔːr.nər flæɡ/" }],
  [33, "Mid elder", { word: "Midfielder", ipa: "/ˈmɪdˌfiːl.dər/", meaning: "Tiền vệ" }],
  [33, "Goal line", { ipa: "/ˈɡoʊl laɪn/" }],

  // --- Topic 44 (giáo dục) ---
  [
    44,
    "Quali cation",
    { word: "Qualification", ipa: "/ˌkwɒl.ɪ.fɪˈkeɪ.ʃən/", meaning: "Trình độ chuyên môn" },
  ],
  [44, "High school", { ipa: "/ˈhaɪ skuːl/" }],
  [44, "Tuition fee", { ipa: "/tjuːˈɪʃ.ən fiː/" }],

  // --- Topic 60 (ngân hàng) ---
  [60, "Sta movements", { word: "Staff movements", meaning: "Luân chuyển nhân sự" }],
  [60, "Back-o ce", { word: "Back-office", ipa: "/ˈbæk ɒf.ɪs/", meaning: "Văn phòng hành chính" }],
  [60, "Insecurity", { meaning: "Tính không an toàn" }],
  [60, "Corrupt", { meaning: "Tham nhũng" }],

  // --- Topic 4 (biển) ---
  [4, "Jellysh", { word: "Jellyfish", ipa: "/ˈdʒel.i.fɪʃ/" }],
  [4, "Shellsh", { word: "Shellfish", ipa: "/ˈʃel.fɪʃ/" }],
  [4, "Starsh", { word: "Starfish", ipa: "/ˈstɑːr.fɪʃ/" }],

  // --- Topic 9 (nhà bếp) ---
  [9, "Co ee maker", { word: "Coffee maker", ipa: "/ˈkɒf.i ˌmeɪ.kər/", meaning: "Máy pha cà phê" }],
  [9, "Oven", { pos: "n" }],

  // --- Topic 6 (mua sắm) ---
  [6, "Grocery store", { meaning: "Cửa hàng tạp hóa" }],

  // --- Topic 3 (hoạt động thường ngày) ---
  [3, "Turn o", { word: "Turn off", ipa: "/ˌtɜːrn ˈɒf/", meaning: "Tắt" }],
  [3, "Surf the internet", { meaning: "Lướt mạng" }],
  [3, "Meditation", { meaning: "Thiền" }],
  [3, "Finish working", { ipa: "/ˈfɪn.ɪʃ ˈwɜː.kɪŋ/" }],
  [3, "Have a bath", { ipa: "/ˌhæv ə ˈbɑːθ/" }],
  [3, "Make breakfast", { ipa: "/ˌmeɪk ˈbrek.fəst/" }],
  [3, "Set the alarm", { ipa: "/ˌset ði əˈlɑːm/" }],
  [3, "Get up", { ipa: "/ˈɡet ʌp/" }],
  [3, "Make up", { ipa: "/ˈmeɪk ʌp/" }],
  [3, "Shave", { ipa: "/ʃeɪv/" }],
  [3, "Wake up", { ipa: "/ˈweɪk ʌp/" }],
  [3, "Watch television", { ipa: "/ˌwɒtʃ ˈtel.ɪ.vɪʒ.ən/" }],
  [3, "Read newspapers", { ipa: "/ˌriːd ˈnjuːzˌpeɪ.pəz/" }],

  // --- Topic 14 (máy tính) ---
  [14, "Save", { word: "Save as", meaning: "Lưu (dưới tên)" }],

  // --- Topic 15 (công việc nhà) ---
  [15, "Water the plants", { ipa: "/ˈwɔː.tər ðə ˈplɑːnts/" }],

  // --- Topic 16 (cửa hàng) ---
  [16, "Candy store", { meaning: "Cửa hàng kẹo" }],
  [16, "Food stall", { meaning: "Quán ăn" }],

  // --- Topic 19 (Tết trung thu) ---
  [19, "Perform", { pos: "v" }],

  // --- Topic 20 (thể thao) ---
  [20, "Dart", { meaning: "Ném phi tiêu" }],

  // --- Topic 21 (quê hương) ---
  [21, "Bu alo", { word: "Buffalo", ipa: "/ˈbʌf.ə.ləʊ/" }],
  [21, "Field", { ipa: "/fiːld/" }],
  [21, "Cli", { word: "Cliff", ipa: "/klɪf/" }],
  [21, "Terraced house", { ipa: "/ˈter.ɪst ˌhaʊs/" }],

  // --- Topic 22 (đám cưới) ---
  [22, "Brother-in-law", { meaning: "Anh/em rể, anh/em chồng, anh/em vợ" }],
  [22, "Sister-in-law", { meaning: "Chị/em dâu, chị/em chồng, chị/em vợ" }],

  // --- Topic 23 (sân bay) ---
  [23, "Switch o", { word: "Switch off", ipa: "/ˌswɪtʃ ˈɒf/", meaning: "Tắt" }],
  [23, "Take o", { word: "Take off", ipa: "/ˈteɪk ɒf/", meaning: "Cất cánh" }],
  [23, "Con scate", { word: "Confiscate", ipa: "/ˈkɒn.fɪ.skeɪt/", meaning: "Tịch thu" }],

  // --- Topic 25 (rau, củ, quả) ---
  [25, "Rice Paddy", { word: "Rice paddy herb", meaning: "Ngò ôm" }],
  [25, "Batata", { ipa: "/bəˈtɑː.tə/" }],
  [25, "Onion", { ipa: "/ˈʌn.jən/" }],
  [25, "Artichoke", { ipa: "/ˈɑː.tɪ.tʃəʊk/" }],
  [25, "Beetroot", { ipa: "/ˈbiːt.ruːt/" }],

  // --- Topic 27 (giao thông) ---
  [27, "Tra c", { word: "Traffic", ipa: "/ˈtræf.ɪk/", meaning: "Giao thông" }],
  [27, "Road sign", { meaning: "Biển báo giao thông" }],
  [27, "Parking space", { meaning: "Chỗ đỗ xe" }],
  [27, "Speeding ne", { word: "Speeding fine", ipa: "/ˈspiːdɪŋ faɪn/", meaning: "Phạt tốc độ" }],
  [27, "Drive", { pos: "v" }],

  // --- Topic 28 (cảm xúc) ---
  [28, "Bored", { pos: "adj" }],

  // --- Topic 29 (tính cách) ---
  [29, "Sel sh", { word: "Selfish", ipa: "/ˈsel.fɪʃ/", meaning: "Ích kỷ" }],
  [29, "Reserved", { ipa: "/rɪˈzɜːvd/" }],
  [29, "Con dent", { word: "Confident", ipa: "/ˈkɒn.fɪ.dənt/", meaning: "Tự tin" }],
  [29, "Hostile", { ipa: "/ˈhɒs.taɪl/" }],

  // --- Topic 30 (đồ uống) ---
  [30, "Co ee", { word: "Coffee", ipa: "/ˈkɒf.i/", meaning: "Cà phê" }],
  [30, "Beer", { ipa: "/bɪər/" }],

  // --- Topic 32 (phim ảnh) ---
  [32, "Action lm", { word: "Action film", meaning: "Phim hành động" }],
  [32, "Silent lm", { word: "Silent film", meaning: "Phim câm" }],

  // --- Topic 34 (Giáng sinh) ---
  [34, "Sled", { pos: "n" }],

  // --- Topic 39 (trường học) ---
  [39, "Pen", { ipa: "/pen/" }],
  [39, "High school", { meaning: "Trường trung học phổ thông" }],
  [39, "Geography", { ipa: "/dʒiˈɒɡ.rə.fi/" }],

  // --- Topic 41 (thời tiết) ---
  [41, "Icy", { pos: "adj" }],
  [41, "Sunny", { pos: "adj" }],
  [41, "Fine", { pos: "adj" }],

  // --- Topic 43 (bộ phận cơ thể) ---
  [43, "Arm", { ipa: "/ɑːm/" }],
  [43, "Armpit", { ipa: "/ˈɑːmˌpɪt/" }],

  // --- Topic 45 (gia đình) ---
  [45, "Brother-in-law", { meaning: "Anh/em rể, anh/em chồng, anh/em vợ" }],
  [45, "Sister-in-law", { meaning: "Chị/em dâu, chị/em chồng, chị/em vợ" }],
  [45, "Parent", { ipa: "/ˈpeə.rənt/" }],
  [45, "Take care of", { ipa: "/ˌteɪk ˈkeər əv/" }],

  // --- Topic 47 (động vật) ---
  [47, "Gira e", { word: "Giraffe", ipa: "/dʒəˈræf/" }],

  // --- Topic 49 (học tập) ---
  [49, "Pen", { ipa: "/pen/" }],

  // --- Topic 52 (hải sản) ---
  [52, "Cutlesh", { word: "Cuttlefish", ipa: "/ˈkʌt.əl.fɪʃ/" }],
  [52, "Jellysh", { word: "Jellyfish", ipa: "/ˈdʒel.i.fɪʃ/" }],

  // --- Topic 53 (năng lượng) ---
  [53, "Re nery", { word: "Refinery", ipa: "/rɪˈfaɪ.nər.i/" }],

  // --- Topic 54 (nghề nghiệp) ---
  [54, "Tour guide", { ipa: "/ˈtʊər ɡaɪd/" }],
  [54, "Self-employed", { ipa: "/ˌsɛlf.ɪmˈplɔɪd/" }],
  [54, "Sales manager", { meaning: "Giám đốc kinh doanh" }],
  [54, "Mechanic", { meaning: "Thợ cơ khí" }],
  [54, "Sanitation worker", { meaning: "Lao công" }],
  [54, "Police o cer", { word: "Police officer", ipa: "/pəˈliːs əˈfɪs.ər/", meaning: "Cảnh sát" }],

  // --- Topic 55 (chế độ ăn uống) ---
  [55, "Keep- t", { word: "Keep-fit", meaning: "Thể dục" }],
  [55, "Goiter", { ipa: "/ˈɡɔɪ.tər/" }],

  // --- Topic 56 (thảm họa thiên nhiên) ---
  [56, "Forest re", { word: "Forest fire", meaning: "Cháy rừng" }],

  // --- Topic 57 (chỉ đường) ---
  [57, "In front of", { ipa: "/ɪn ˈfrʌnt əv/" }],

  // --- Topic 58 (phòng khách sạn) ---
  [58, "Booking o ce", { word: "Booking office", meaning: "Phòng bán vé" }],

  // --- Topic 59 (bưu điện) ---
  [59, "Graphic", { meaning: "Thuộc đồ họa" }],
  [59, "Sta", { word: "Staff", ipa: "/stɑːf/" }],
  [59, "Thoughtful", { ipa: "/ˈθɔːt.fəl/" }],

  // --- Topic 3 (remaining) ---
  [3, "Meditation", { ipa: "/ˌmed.ɪˈteɪ.ʃən/" }],
];

function main() {
  const raw = fs.readFileSync(SRC, "utf8");
  const data = JSON.parse(raw);

  let fixCount = 0;
  let missing = 0;
  const missingList = [];

  for (const [topicIdx, oldWord, newFields] of FIXES) {
    const t = data.topics.find((t) => t.index === topicIdx);
    if (!t) {
      console.log(`Topic ${topicIdx} not found.`);
      missing++;
      continue;
    }
    const card = t.cards.find((c) => c.word === oldWord);
    if (!card) {
      console.log(`T${topicIdx}: "${oldWord}" not found.`);
      missingList.push(`T${topicIdx} ${oldWord}`);
      missing++;
      continue;
    }
    for (const [k, v] of Object.entries(newFields)) {
      card[k] = v;
    }
    fixCount++;
  }

  console.log(`Applied ${fixCount} fixes, ${missing} missing.`);
  if (missingList.length) console.log("Missing:", missingList.join("\n"));

  fs.writeFileSync(SRC, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote: ${SRC}`);
}

if (require.main === module) main();
