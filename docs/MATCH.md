# Match (Ghép thẻ)

Trò chơi nối **thuật ngữ ↔ định nghĩa** với tốc độ nhanh nhất. Tái sử dụng các bộ
flashcards đã có (`lib/flashcards-data.ts`, `lib/flashcards-zh-food.ts`, và các
bộ do người dùng tạo/import).

## Đường dẫn

- Hub: `/match`
- Chơi: `/match/play/[setId]` (setId là ID của FlashcardSet, ví dụ `builtin:ielts-100-core`)

## Cấu trúc code

| File | Vai trò |
|------|---------|
| `lib/match-storage.ts` | localStorage helpers (records / history / formatters). |
| `components/MatchGame.tsx` | Grid 2 cột, timer, reducer-driven matching state. |
| `components/MatchResult.tsx` | Màn hình kết quả + "kỷ lục mới". |
| `app/match/page.tsx` | Hub liệt kê các bộ flashcards + PB. |
| `app/match/play/[setId]/page.tsx` | Pre-game (chọn số cặp) → game → result. |

## Cơ chế chơi

1. Người chơi chọn 1 trong 3 độ dài (6 / 8 / 10 cặp) tùy kích thước bộ.
2. Bộ trộn ngẫu nhiên `N` cặp; `leftTiles` chứa `front` (thuật ngữ), `rightTiles`
   chứa `back` (định nghĩa).
3. Người chơi click 1 thẻ bên trái → highlight; click 1 thẻ bên phải → kiểm tra
   trong 600ms (animation window):
   - **Trùng id** → khóa cả 2 thẻ, tăng `matched`.
   - **Khác id** → flash đỏ + shake, tăng `mistakes`.
4. Khi tất cả cặp được khớp, `state.status = "finished"` → useEffect tính
   `finalMs`, gọi `recordMatchRun()` để lưu vào localStorage, hiển thị kết quả.

## Lưu trữ

- **`qthtm_match_records`** – `Record<setId, MatchRecord>` (PB + attempts).
- **`qthtm_match_history`** – `MatchHistoryEntry[]`, giới hạn 50 lượt gần nhất.

## Mở rộng trong tương lai

- Multiplayer real-time (Firebase Realtime DB).
- Streak / combo bonus khi ghép đúng liên tiếp.
- Âm thanh feedback (đã có pattern trong FlashcardStudyState).
- "Daily challenge" – cùng 1 bộ cho mọi người chơi trong ngày.
