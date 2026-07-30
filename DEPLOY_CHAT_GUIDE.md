# HƯỚNG DẪN DEPLOY LÊN VERCEL ĐỂ CHAT HOẠT ĐỘNG CÔNG KHAI

# ================================================================

## Bước 1: Lấy Firebase Config từ Console

1. Vào https://console.firebase.google.com/
2. Chọn project "bao-mat-may-tinh"
3. Vào Settings (biểu tượng ⚙️) → General
4. Kéo xuống "Your apps" → Click vào app web của bạn
5. Copy toàn bộ firebaseConfig

## Bước 2: Thêm Environment Variables trên Vercel

1. Vào https://vercel.com/dashboard
2. Chọn project "BaoMatMayTinh-Quiz" (hoặc tên tương tự)
3. Vào Settings → Environment Variables
4. Thêm từng biến sau (áp dụng cho Production):

```
NEXT_PUBLIC_FIREBASE_API_KEY       = [giá trị từ firebaseConfig.apiKey]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN   = [giá trị từ firebaseConfig.authDomain]
NEXT_PUBLIC_FIREBASE_PROJECT_ID    = [giá trị từ firebaseConfig.projectId]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = [giá trị từ firebaseConfig.storageBucket]
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = [giá trị từ firebaseConfig.messagingSenderId]
NEXT_PUBLIC_FIREBASE_APP_ID        = [giá trị từ firebaseConfig.appId]
```

## Bước 3: Redeploy

Sau khi thêm Environment Variables:

1. Vào mục "Deployments" trên Vercel
2. Click vào deployment mới nhất
3. Click "..." → "Redeploy"

## Bước 4: Cấu hình Firestore Rules

1. Vào Firebase Console → Firestore Database → Rules
2. Paste rules từ file FIRESTORE_CHAT_RULES.txt trong project
3. Click "Publish"

## Bước 5: Thêm Authorized Domains

1. Firebase Console → Authentication → Settings → Authorized domains
2. Thêm domain Vercel của bạn (ví dụ: bao-mat-may-tinh.vercel.app)

## SAU KHI DEPLOY THÀNH CÔNG

Mọi người sẽ truy cập chat tại:

- https://[ten-project].vercel.app/chat

Tin nhắn sẽ được lưu realtime trên Firestore và mọi người có thể trò chuyện cùng nhau!
