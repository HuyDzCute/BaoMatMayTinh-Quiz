import type { Flashcard, FlashcardSet } from "./types";

/**
 * VOCAB-IELTS — Tổng hợp từ vựng & cụm từ IELTS từ bộ 20 PDF "IELTS Nguyễn Huyền"
 * trong `c:\Users\Administrator\Downloads\VOCABULARY - 2021\`.
 *
 * Mỗi PDF chủ đề → 1 bộ thẻ (FlashcardSet), gồm:
 *   - vocab-* : các cụm từ chính + IPA + ví dụ ngắn tiếng Anh
 *   - para-*  : paraphrase / đồng nghĩa
 *   - idiom-* : thành ngữ / phrasal verbs
 *
 * Một số chủ đề gần nhau được gộp lại để người học dễ quản lý (ví dụ:
 * "Daily Routines" + "Free Time" → "Daily Life"; "Appearance & Character Traits"
 * + "Family" + "Cohabitation" + "Friendship" → "People & Relationships").
 */

const noPron: Record<string, string> = {};
const np: (s: string) => string | undefined = (s) => noPron[s] || undefined;

// ────────────────────────────────────────────────────────────────────────────
// SET 1 — PREFIX & SUFFIX (Tiền tố, hậu tố trong tiếng Anh)
// ────────────────────────────────────────────────────────────────────────────
const prefixSuffixCards: Flashcard[] = [
  // ── PREFIX ──
  {
    id: "ps-prefix-anti",
    front: "anti- (against) = chống/kháng lại",
    back: "antivirus: kháng virut; antibiotic: kháng sinh",
    pronunciation: "/ˈænti/",
    example: "Antibiotics are used to fight bacterial infections.",
  },
  {
    id: "ps-prefix-auto",
    front: "auto- (self) = tự thân, tự phát",
    back: "autopilot: chế độ bay tự động; autofocus: chế độ lấy nét tự động",
    pronunciation: "/ˈɔːtəʊ/",
    example: "The plane flew on autopilot.",
  },
  {
    id: "ps-prefix-re",
    front: "re- (again or back) = lại, một lần nữa",
    back: "rewrite: viết lại; resend: gửi lại",
    pronunciation: "/riː/",
    example: "Please rewrite this essay.",
  },
  {
    id: "ps-prefix-over",
    front: "over- (too much) = quá, vượt mức, trên...",
    back: "overreact: phản ứng thái quá; overweight: thừa cân",
    pronunciation: "/ˈəʊvər/",
    example: "He tends to overreact in stressful situations.",
  },
  {
    id: "ps-prefix-mis",
    front: "mis- (badly or wrongly) = sai",
    back: "misunderstand: hiểu sai; mislead: dẫn dắt ai đó tin vào điều không đúng",
    pronunciation: "/mɪs/",
    example: "Don't mislead the readers with false facts.",
  },
  {
    id: "ps-prefix-out",
    front: "out- (more or better than others) = quá..., hơn...",
    back: "outrun: chạy nhanh hơn; outnumber: có số lượng nhiều hơn",
    pronunciation: "/aʊt/",
    example: "Women now outnumber men in the workforce.",
  },
  {
    id: "ps-prefix-co",
    front: "co- (together) = cùng nhau",
    back: "co-exist: cùng tồn tại; co-operate: hợp tác",
    pronunciation: "/kəʊ/",
    example: "We must co-exist peacefully.",
  },
  {
    id: "ps-prefix-de",
    front: "de- (go down or make less) = giảm, làm ít đi",
    back: "devalue: mất giá; degenerate: thoái hóa",
    pronunciation: "/diː/",
    example: "The currency was devalued overnight.",
  },
  {
    id: "ps-prefix-fore",
    front: "fore- (earlier, before) = trước, sớm",
    back: "foresee: nhìn thấy trước; foreleg: chân trước của động vật",
    pronunciation: "/fɔːr/",
    example: "Nobody could foresee the crisis.",
  },
  {
    id: "ps-prefix-pre",
    front: "pre- (before) = trước",
    back: "prejudge: vội phán xét; pretest: thử, kiểm tra trước",
    pronunciation: "/priː/",
    example: "Don't prejudge people you don't know.",
  },
  {
    id: "ps-prefix-sub",
    front: "sub- (under/below) = dưới",
    back: "substandard: dưới mức tiêu chuẩn; subway: tàu điện ngầm",
    pronunciation: "/sʌb/",
    example: "The building was substandard and unsafe.",
  },
  {
    id: "ps-prefix-super",
    front: "super- (above, over, beyond, excellent) = siêu, vượt trên",
    back: "supermarket: siêu thị; superman: siêu nhân",
    pronunciation: "/ˈsuːpər/",
    example: "She has a supernatural ability to calm people.",
  },
  {
    id: "ps-prefix-under",
    front: "under- (not enough) = không đủ",
    back: "underfunded: cấp không đủ vốn; underdeveloped: kém phát triển",
    pronunciation: "/ˈʌndər/",
    example: "The school is underfunded.",
  },
  {
    id: "ps-prefix-dis",
    front: "dis- (reverses the meaning of the verb) = chỉ sự đối nghịch, trái ngược",
    back: "disappear: biến mất; dishonest: không trung thực",
    pronunciation: "/dɪs/",
    example: "The magician made the rabbit disappear.",
  },
  // ── SUFFIX (no noun) ──
  {
    id: "ps-suffix-acy",
    front: "-acy (state or quality) = trạng thái, tình trạng, chất lượng",
    back: "democracy: dân chủ; accuracy: tính chính xác",
    pronunciation: "/əsi/",
    example: "Democracy requires active participation.",
  },
  {
    id: "ps-suffix-al",
    front: "-al (act or process of) = chỉ hành động, quá trình",
    back: "refusal: sự từ chối; survival: sự sống sót",
    pronunciation: "/əl/",
    example: "His refusal to cooperate shocked everyone.",
  },
  {
    id: "ps-suffix-dom",
    front: "-dom (place or state of being) = nơi chốn hoặc trạng thái tồn tại",
    back: "kingdom: vương quốc; freedom: sự tự do",
    pronunciation: "/dəm/",
    example: "Freedom of speech is a basic right.",
  },
  {
    id: "ps-suffix-er-or",
    front:
      "-er, -or (someone or something that performs an action) = chỉ người/vật làm công việc cụ thể",
    back: "professor: giáo sư; heater: máy sưởi",
    pronunciation: "/ər/",
    example: "The professor gave a fascinating lecture.",
  },
  {
    id: "ps-suffix-ism",
    front: "-ism (doctrine, belief) = chỉ giáo điều, niềm tin, đảng phái",
    back: "terrorism: chủ nghĩa khủng bố; communism: chủ nghĩa cộng sản",
    pronunciation: "/ɪzəm/",
    example: "Terrorism threatens global peace.",
  },
  {
    id: "ps-suffix-ity-ty",
    front: "-ity, -ty (quality of) = trạng thái hay chất lượng",
    back: "inactivity: trạng thái không hoạt động; brutality: sự tàn bạo",
    pronunciation: "/ɪti/",
    example: "Inactivity leads to many health problems.",
  },
  {
    id: "ps-suffix-ment",
    front: "-ment (condition of) = tình trạng, điều kiện",
    back: "argument: sự tranh luận; achievement: thành tựu",
    pronunciation: "/mənt/",
    example: "Winning the award was a great achievement.",
  },
  {
    id: "ps-suffix-ness",
    front: "-ness (state of being) = trạng thái (ghép với tính từ)",
    back: "sadness: sự buồn bã; tiredness: sự mệt mỏi",
    pronunciation: "/nəs/",
    example: "Her sadness was obvious to everyone.",
  },
  {
    id: "ps-suffix-ship",
    front: "-ship (position held) = chỉ vị trí",
    back: "ownership: sự sở hữu; friendship: tình bạn",
    pronunciation: "/ʃɪp/",
    example: "Friendship is priceless.",
  },
  {
    id: "ps-suffix-able-ible",
    front: "-able, -ible (capable of being) = khả năng có thể làm gì",
    back: "edible: có thể ăn được; drinkable: có thể uống được",
    pronunciation: "/əbl/",
    example: "Are these mushrooms edible?",
  },
  {
    id: "ps-suffix-ful",
    front: "-ful (full of, characterized by) = đầy, đặc trưng bởi...",
    back: "careful: cẩn thận; colourful: đầy màu sắc",
    pronunciation: "/fʊl/",
    example: "Be careful when crossing the road.",
  },
  {
    id: "ps-suffix-ish",
    front: "-ish (having the quality of) = có phẩm chất của",
    back: "fiendish, childish, snobbish",
    pronunciation: "/ɪʃ/",
    example: "His childish behaviour embarrassed his parents.",
  },
  {
    id: "ps-suffix-ious-ous",
    front: "-ious, -ous (characterized by) = đặc trưng bởi...",
    back: "nutritious: giàu dinh dưỡng; dangerous: nguy hiểm",
    pronunciation: "/əs/",
    example: "Vegetables are highly nutritious.",
  },
  {
    id: "ps-suffix-less",
    front: "-less (without) = không",
    back: "colourless: không màu; effortless: không cần nỗ lực",
    pronunciation: "/ləs/",
    example: "She made the task look effortless.",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SET 2 — APPEARANCE & CHARACTER TRAITS
// ────────────────────────────────────────────────────────────────────────────
const appearanceCards: Flashcard[] = [
  // Ngoại hình
  {
    id: "appear-round-face",
    front: "a round face",
    back: "mặt tròn",
    pronunciation: "/ə raʊnd feɪs/",
    example: "She has a round face.",
  },
  {
    id: "appear-pointed-face",
    front: "a pointed face",
    back: "mặt nhọn",
    pronunciation: "/ə ˈpɔɪntɪd feɪs/",
    example: "He has a pointed face.",
  },
  {
    id: "appear-hair-len",
    front: "short/long/shoulder-length/fair hair",
    back: "tóc ngắn/dài/ngang vai/vàng hoe",
    pronunciation: "/heər/",
    example: "She has shoulder-length hair.",
  },
  {
    id: "appear-height",
    front: "tall/short/medium height",
    back: "cao/thấp/có chiều cao trung bình",
    pronunciation: "/haɪt/",
    example: "He is of medium height.",
  },
  {
    id: "appear-young",
    front: "to look young for your age",
    back: "nhìn trẻ hơn tuổi thật",
    pronunciation: "/tu lʊk jʌŋ fɔːr jɔːr eɪdʒ/",
    example: "She looks young for her age.",
  },
  {
    id: "appear-your-age",
    front: "to look your age",
    back: "nhìn đúng với tuổi thật",
    pronunciation: "/tu lʊk jɔːr eɪdʒ/",
    example: "He looks his age.",
  },
  {
    id: "appear-getting-on",
    front: "to be getting on a bit",
    back: "đang già đi",
    pronunciation: "/tu biː ˈɡetɪŋ ɒn ə bɪt/",
    example: "He is getting on a bit now.",
  },
  {
    id: "appear-middle-aged",
    front: "middle-aged",
    back: "trung niên (khoảng 45-65)",
    pronunciation: "/ˌmɪdl ˈeɪdʒd/",
    example: "A middle-aged man opened the door.",
  },
  {
    id: "appear-lean",
    front: "lean",
    back: "cơ thể săn chắc",
    pronunciation: "/liːn/",
    example: "He used to be so lean.",
  },
  {
    id: "appear-slender",
    front: "slender",
    back: "thon thả, mảnh mai",
    pronunciation: "/ˈslendər/",
    example: "She has a slender figure.",
  },
  {
    id: "appear-well-built",
    front: "well-built",
    back: "lực lưỡng, cường tráng",
    pronunciation: "/wel bɪlt/",
    example: "He is well-built.",
  },
  {
    id: "appear-double-chin",
    front: "double chin",
    back: "cằm ngấn mỡ, nọng cằm",
    pronunciation: "/ˈdʌbl tʃɪn/",
    example: "He's got a double chin.",
  },
  {
    id: "appear-neat",
    front: "never a hair out of place",
    back: "gọn gàng, chỉn chu",
    pronunciation: "/ˈnevər ə heər aʊt əv pleɪs/",
    example: "Her sister is always well-dressed, with never a hair out of place.",
  },
  // Tính cách
  {
    id: "appear-introverted",
    front: "introverted",
    back: "hướng nội",
    pronunciation: "/ˌɪntrəˈvɜːtɪd/",
    example: "He is introverted and quiet.",
  },
  {
    id: "appear-extroverted",
    front: "extroverted",
    back: "hướng ngoại",
    pronunciation: "/ˈekstrəvɜːtɪd/",
    example: "She is extroverted and sociable.",
  },
  {
    id: "appear-outgoing",
    front: "outgoing",
    back: "dễ hòa đồng",
    pronunciation: "/ˈaʊtɡəʊɪŋ/",
    example: "He is an outgoing person.",
  },
  {
    id: "appear-painfully-shy",
    front: "painfully shy",
    back: "rất nhút nhát",
    pronunciation: "/ˈpeɪnfəli ʃaɪ/",
    example: "She was painfully shy at school.",
  },
  {
    id: "appear-reserved",
    front: "reserved",
    back: "kín đáo, dè dặt",
    pronunciation: "/rɪˈzɜːvd/",
    example: "He is reserved and shy.",
  },
  {
    id: "appear-life-soul",
    front: "to be the life and soul of the party",
    back: "người là trung tâm/linh hồn của buổi tiệc",
    pronunciation: "/tu biː ðə laɪf ənd səʊl əv ðə ˈpɑːti/",
    example: "She is always the life and soul of the party.",
  },
  {
    id: "appear-bubbly",
    front: "bubbly",
    back: "vui vẻ, sôi nổi",
    pronunciation: "/ˈbʌbli/",
    example: "She has a bubbly personality.",
  },
  {
    id: "appear-lose-temper",
    front: "to lose one's temper",
    back: "mất bình tĩnh, nổi nóng",
    pronunciation: "/tu luːz wʌnz ˈtempər/",
    example: "She lost her temper with a customer.",
  },
  {
    id: "appear-easy-going",
    front: "easy going",
    back: "vô tư, ung dung",
    pronunciation: "/ˌiːzi ˈɡəʊɪŋ/",
    example: "He is so easy going.",
  },
  {
    id: "appear-humour",
    front: "good sense of humour",
    back: "có khiếu hài hước",
    pronunciation: "/ɡʊd sens əv ˈhjuːmər/",
    example: "He has a good sense of humour.",
  },
  {
    id: "appear-patient",
    front: "patient",
    back: "kiên nhẫn",
    pronunciation: "/ˈpeɪʃnt/",
    example: "She is patient with her students.",
  },
  {
    id: "appear-respectful",
    front: "respectful",
    back: "thể hiện sự tôn trọng",
    pronunciation: "/rɪˈspektfl/",
    example: "Joe is always polite and respectful.",
  },
];

export { prefixSuffixCards, appearanceCards };
