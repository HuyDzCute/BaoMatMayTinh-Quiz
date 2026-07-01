# Firebase Setup Guide — QTHTM Quiz

Hướng dẫn từng bước tạo Firebase project cho app QTHTM Quiz.

## 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → đặt tên `qthtm-quiz` (hoặc tên tùy ý)
3. Tắt Google Analytics (không cần) → **Create project**

## 2. Enable Authentication

1. Sidebar → **Build → Authentication** → Get started
2. Tab **Sign-in method** → bật 2 provider:
   - **Google**: bật → chọn support email → Save
   - **Anonymous**: bật → Save

## 3. Tạo Firestore Database

1. Sidebar → **Build → Firestore Database** → Create database
2. Chọn **Production mode** → Next
3. Region: `asia-southeast1` (Singapore) hoặc gần bạn nhất → Enable

## 4. Cấu hình Firestore Rules

Vào tab **Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Leaderboard: ai cũng đọc được, chỉ user đã đăng nhập mới ghi được
    match /leaderboard/{entryId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.playerName is string
        && request.resource.data.score is number
        && request.resource.data.percentage is number
        && request.resource.data.percentage >= 0
        && request.resource.data.percentage <= 100;
      allow update, delete: if false; // không cho sửa/xoá từ client
    }

    // User profiles (chỉ user đó đọc/sửa được)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

## 5. Tạo Web App + Lấy Config

1. Project Overview (home) → Click icon **Web** (`</>`)
2. Đặt nickname `QTHTM Quiz Web` → Register app
3. **Copy `firebaseConfig` object** (không cần npm firebase CLI)
4. Paste vào `.env.local` của bạn:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=qthtm-quiz.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=qthtm-quiz
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=qthtm-quiz.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXX
```

5. Tiếp tục Console → Next → Continue to console

## 6. Authorized Domains (cho Google Sign-in)

Authentication → Settings → tab **Authorized domains** → thêm:
- `localhost` (đã có sẵn cho dev)

Nếu deploy lên Vercel/domain riêng, thêm domain đó.

## 7. Chạy App

```bash
# Copy file env
cp .env.local.example .env.local
# Điền config vào .env.local

npm run dev
```

Mở `http://localhost:3000` → click nút "Đăng nhập" ở header → chọn Google hoặc Anonymous.

## Cấu trúc dữ liệu Firestore

### Collection: `leaderboard/{autoId}`
```ts
{
  playerName: string    // "Nguyễn Văn A"
  score: number          // 80
  percentage: number     // 80
  setName: string        // "BỘ 190 CÂU QTHTM (Thầy Sáng)"
  date: string           // ISO 8601: "2026-07-01T..."
  uid: string            // Firebase user ID
  photoURL?: string      // Google avatar (optional)
  timestamp: number      // Date.now() - để sort
}
```

### Collection: `users/{uid}`
```ts
{
  displayName: string
  email: string
  photoURL?: string
  totalGames: number
  bestScore: number
  bestPercentage: number
  createdAt: number
}
```

## Free Tier Limits (Spark Plan)

| Resource | Limit |
|----------|-------|
| Reads | 50K / ngày |
| Writes | 20K / ngày |
| Deletes | 20K / ngày |
| Storage | 1 GB |
| Auth | Unlimited MAU |

Đủ cho ~hàng nghìn người chơi/ngày.

## Troubleshooting

- **Lỗi "Missing or insufficient permissions"**: Check lại Rules ở bước 4
- **Google Sign-in popup bị block**: Cho phép popup trên trình duyệt
- **Config không load**: Check `.env.local` có đúng tên biến `NEXT_PUBLIC_FIREBASE_*` chưa