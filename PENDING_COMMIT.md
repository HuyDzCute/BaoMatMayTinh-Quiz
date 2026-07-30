## Changes pushed locally (chưa push lên GitHub)

### 3 fix `Flashcards` trong commit này

**1. `lib/flashcards-storage.ts` — `getFlashcardSet` chấp nhận legacy setId**

Trước: nếu URL chứa `[[id]]` (kiểu `builtin:[[zh-food-cac-mon-khai-vi]]`) thì `getFlashcardSet` trả về `undefined` → trang study kêu "không tìm thấy bộ thẻ".

Sau: tự strip `[[…]]`, thử lookup bằng cả canonical + legacy id, bao gồm cả user-set override.

**2. `app/flashcards/[setId]/page.tsx` — auto-redirect sang canonical id**

Nếu URL truy cập bằng legacy id mà `getFlashcardSet` đã resolve sang id canonical khác → `router.replace()` về canonical.

**3. Empty state — nút "Xóa tiến độ"**

Thêm hàm `resetSetProgress(setId)` trong `flashcards-storage.ts` + nút `🗑 Xóa tiến độ` trong empty state của trang study, kèm confirm dialog. Escape hatch cho trường hợp user spam "Dễ" trong test run → queue rỗng.

### Suggested commit message (paste khi GitHub Desktop hỏi)

```
fix(flashcards): support legacy setId [[...]] + reset set progress

- getFlashcardSet() now accepts legacy [[id]] syntax and falls back to
  matching user-set overrides by id
- /flashcards/[setId] auto-redirects to the canonical setId when a
  legacy id resolves to a different canonical id
- add resetSetProgress(setId) helper + "Xóa tiến độ" button in empty
  state (escape hatch for empty queue caused by stale "easy" ratings)
```

### Steps in GitHub Desktop

1. Open GitHub Desktop → `File → Add local repository` →
   chọn `c:\Users\Administrator\Downloads\git\BaoMatMayTinh-Quiz-main`
2. Bên trái sẽ liệt kê 3 files thay đổi:
   - `app/flashcards/[setId]/page.tsx`
   - `lib/flashcards-storage.ts`
3. Paste commit message ở trên → **Commit to main**
4. **Push origin** (nút trên cùng)
5. Xong → Vercel tự trigger build vì đã linked với repo
