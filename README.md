# QTHTM Quiz

Ứng dụng luyện thi trắc nghiệm **Quản Trị Hệ Thống Mạng** với 4 bộ đề (QTHTM 190, QTHTM 150, Linux 350, SAI LÀ TỒI), kèm các tính năng mở rộng:

- **Quiz** — trắc nghiệm 4 đáp án, timer mỗi câu + timer tổng.
- **IELTS Reading / Speaking** — sub-section với passage dài + ghi âm câu trả lời.
- **Flashcards** — học từ vựng với thuật toán SM-2 spaced repetition, import CSV/TXT, thẻ built-in + user.
- **Match Game** — ghép thuật ngữ với định nghĩa, có level & kỷ lục cá nhân.
- **Leaderboard / History** — bảng xếp hạng + lịch sử thi, có fallback localStorage khi offline.

Built on **Next.js 16 + React 19 + Tailwind v4 + Firebase 12 (Firestore + Auth)**.

---

## Tài liệu

| File | Nội dung |
| --- | --- |
| [`SPEC.md`](./SPEC.md) | Concept, design language, layout, components, data model. |
| [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) | Hướng dẫn tạo Firebase project + Rules + Auth. |
| [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) | **Hướng dẫn deploy lên Vercel từng bước.** |
| [`.env.local.example`](./.env.local.example) | Mẫu biến môi trường cần điền. |

---

## Chạy local

```bash
# Cần Node.js 18+ (đã test với Node 20 LTS)
npm install --legacy-peer-deps
cp .env.local.example .env.local       # điền config Firebase nếu có
npm run dev                            # http://localhost:3000
```

> `--legacy-peer-deps` là cần thiết vì `lucide-react@^1.22.0` (phiên bản
> hiện đang dùng) chỉ hỗ trợ React ≤ 18. Khi upgrade lucide-react lên
> bản mới hơn, có thể bỏ flag này.

---

## Deploy

Xem **[`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)** để biết cách import vào
Vercel và điền biến môi trường Firebase. Vercel sẽ tự nhận diện Next.js
và dùng `vercel.json` trong repo.

Có thể deploy sang Render cũng được — `render.yaml` đã có sẵn nhưng
**không còn chứa Firebase secrets** (đã chuyển sang env vars để tránh
lộ key trong git history).

---

## Kiến trúc ngắn gọn

```
app/                  # Next.js App Router
  page.tsx            # Trang chủ (chọn bộ đề)
  quiz/[setId]/       # Quiz chính
  result/             # Kết quả
  leaderboard/        # BXH
  history/            # Lịch sử
  flashcards/         # Flashcards hub + review + stats + study
  match/              # Match game hub + play
components/           # UI components
lib/                  # Firebase init, storage, data, types, speech
```

- **`lib/firebase.ts`** — Khởi tạo Firebase an toàn. Nếu thiếu env
  vars, app chạy ở chế độ offline (localStorage only).
- **`lib/storage.ts`** — Lưu/đọc kết quả quiz: cloud-first, local fallback.
- **`lib/auth.tsx`** — AuthProvider (Google + Anonymous) + retry queue.
- **`lib/flashcards-storage.ts`** — LocalStorage cho flashcards + SM-2.
- **`lib/match-storage.ts`** — Kỷ lục Match game + level system.
- **`lib/fuzzy-match.ts`** — Levenshtein + diacritics tolerance.
- **`lib/speech.ts`** — Web Speech API wrapper.

---

## Scripts

```bash
npm run dev       # Next.js dev server
npm run build     # production build (output vào .next/)
npm run start     # serve production build
npm run lint      # ESLint
```
