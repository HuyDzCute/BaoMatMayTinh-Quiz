# Hướng dẫn Deploy lên Vercel — QTHTM Quiz

App này chạy **out-of-the-box** trên Vercel vì đã có đầy đủ config
(`vercel.json`, Next.js 16, Tailwind v4). Hai việc duy nhất bạn cần
làm: **(1) đẩy code lên GitHub**, và **(2) điền biến môi trường
Firebase** trong dashboard Vercel.

> **Lưu ý:** Nếu bạn **chưa cấu hình Firebase**, app vẫn chạy bình
> thường — toàn bộ quiz/history/leaderboard sẽ rơi xuống localStorage,
> người dùng vẫn làm bài và xem kết quả được.

---

## 1. Chuẩn bị local

```bash
# Từ thư mục project
cp .env.local.example .env.local
# Mở .env.local, điền config Firebase (nếu có) — để trống cũng OK
```

**Không commit `.env.local`** — đã có trong `.gitignore` rồi.

Kiểm tra `lucide-react@^1.22.0` đang dùng peer deps cũ hơn React 19, nên
Vercel build phải dùng `--legacy-peer-deps`. Đã được set trong
`vercel.json` → `"installCommand": "npm install --legacy-peer-deps"`.

---

## 2. Đẩy code lên GitHub

Nếu repo chưa có trên GitHub:

```bash
git init
git add .
git commit -m "Initial QTHTM Quiz"
git branch -M main
git remote add origin https://github.com/<your-user>/BaoMatMayTinh-Quiz.git
git push -u origin main
```

> Nếu đã có sẵn GitHub repo, chỉ cần `git push`.

---

## 3. Import vào Vercel

### Cách A — Qua Vercel Dashboard (web)

1. Mở <https://vercel.com/new> và đăng nhập (GitHub).
2. Chọn **"Import Git Repository"** → tìm repo `BaoMatMayTinh-Quiz`.
3. Vercel sẽ tự nhận diện Next.js, framework = `nextjs`.
4. **Trước khi nhấn Deploy**, mở mục **"Environment Variables"** và điền:

| Key                                     | Value (lấy từ Firebase Console)              |
| --------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`          | `AIza…`                                      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`      | `<project-id>.firebaseapp.com`               |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`       | `<project-id>`                               |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`   | `<project-id>.appspot.com`                   |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Số từ Firebase config                     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`           | `1:…:web:…`                                  |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`   | `G-…` (tuỳ chọn — Google Analytics)          |

Mẹo: chọn áp dụng cho cả 3 môi trường **Production / Preview /
Development** để mỗi PR cũng có Firebase riêng.

5. Nhấn **Deploy**. Vercel sẽ:
   - `npm install --legacy-peer-deps`
   - `npm run build`
   - Trả về URL `https://<project>.vercel.app` sau ~2-3 phút.

### Cách B — Qua Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link              # liên kết thư mục với project Vercel
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# lặp lại cho từng biến, trả lời "Production" cho mỗi cái
vercel --prod            # deploy production
```

---

## 4. Cho phép domain trên Firebase (chỉ khi dùng Google Sign-In)

Vì Google Auth popup chỉ hoạt động trên các domain đã whitelist:

1. Vào [Firebase Console](https://console.firebase.google.com/) →
   **Authentication → Settings → Authorized domains**.
2. Thêm `*.vercel.app` (covers cả project Vercel và mọi preview URL).

Nếu bạn có custom domain, thêm cả domain đó vào.

---

## 5. Firestore Rules cho production

Đã có sẵn trong `FIREBASE_SETUP.md`. Nếu bạn deploy production mà
chưa cấu hình Rules, mọi write đến `leaderboard` / `users` sẽ bị
reject với "Missing or insufficient permissions". Nội dung Rules tối
thiểu:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{entryId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.playerName is string
        && request.resource.data.score is number
        && request.resource.data.percentage is number;
      allow update, delete: if false;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 6. Kiểm tra sau deploy

Mở URL Vercel và verify:

- [ ] Trang chủ load, không có lỗi hydration / 404 / 500.
- [ ] Nếu có Firebase: nút "Đăng nhập Google" mở popup được.
- [ ] Làm 1 quiz, nộp bài → vào `/result` thấy điểm.
- [ ] Nếu dùng Firestore: vào Firebase Console → Firestore → `leaderboard`,
      thấy entry mới xuất hiện trong vài giây.

---

## 7. Rollback / re-deploy

- Vercel giữ mọi deployment. Vào **Deployments** trên dashboard, click
  vào một bản build cũ → **Promote to Production**.
- Sau khi sửa code: `git push` → Vercel tự build bản mới (preview URL),
  merge vào `main` → tự promote production.

---

## 8. Troubleshooting

### Build fail: `npm error ERESOLVE` (peer deps)
- Đã có `--legacy-peer-deps` trong `vercel.json`. Nếu vẫn lỗi, kiểm
  tra **Settings → Build & Development** trong Vercel, override
  `Install Command` thành `npm install --legacy-peer-deps`.

### Build fail: `Type error: ...`
- Chạy `npm run build` local trước khi push. Next 16 + React 19 strict
  mode bắt lỗi sớm hơn các phiên bản trước.

### Hydration mismatch warning
- Project đã `suppressHydrationWarning` ở `<html>` và `<body>` cho
  theme toggle (`Header.tsx` đọc localStorage sau mount). Nếu thấy
  warning mới, kiểm tra xem component nào render khác giữa server và
  client (thường là do `Date.now()` / `Math.random()` trong render).

### Firestore "Missing or insufficient permissions"
- Lỗi 99% là do chưa publish Rules, hoặc chưa enable Authentication.

### 404 trên `/quiz/...` sau khi refresh
- Next.js App Router tự xử lý dynamic routes. Nếu vẫn 404, đảm bảo
  không có file `vercel.json` chứa `rewrites` trỏ sai — file trong
  repo này có `rewrites: []` (rỗng), an toàn.
