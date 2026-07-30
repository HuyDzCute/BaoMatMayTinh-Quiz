# 🔐 Firebase & Gemini — Biến môi trường (server-side)

## Tóm tắt

| Biến                     | Phạm vi         | Bắt buộc cho                          |
| ------------------------ | --------------- | ------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_*` | client + server | Toàn bộ app (auth, Firestore SDK)     |
| `GEMINI_API_KEY`         | **server-only** | `/api/gemini` (AI Coach)              |
| `GEMINI_MODEL`           | server-only     | Optional, mặc định `gemini-2.0-flash` |
| `FIREBASE_PROJECT_ID`    | **server-only** | `/api/chat/*` (Firestore REST)        |

## Cách setup

1. Copy `.env.local.example` thành `.env.local`
2. Điền các giá trị thật vào file `.env.local` (KHÔNG commit file này)
3. Restart dev server: `npm run dev`

## Lấy API key Gemini

- Truy cập: <https://aistudio.google.com/apikey>
- Bấm **Create API key** → chọn project (hoặc tạo mới)
- Paste vào `GEMINI_API_KEY` trong `.env.local`
- ⚠️ Giữ key BÍ MẬT, đừng commit lên GitHub

## Kiến trúc AI Coach

```
Client (React)  ──▶  /api/gemini  ──▶  Google Gemini
                     (server)         (trả text)
                  key lưu ở server

Client (React)  ──▶  /api/chat/... ──▶  Firestore REST
                     (server)         (lưu userId/convId/messages)
                  forward idToken
                  từ client để xác thực
```

**Firestore data model** (collection `chats`):

```
chats/{conversationId}
  ├── userId:        string
  ├── title:         string
  ├── messageCount:  number
  ├── createdAt:     timestamp
  ├── updatedAt:     timestamp
  └── messages/      (subcollection)
       ├── {messageId}
       │    ├── userId:    string
       │    ├── role:      'user' | 'model'
       │    ├── content:   string
       │    └── createdAt: timestamp
```

## Security Rules gợi ý cho Firestore

```javascript
match /chats/{conversationId} {
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.userId;

  match /messages/{messageId} {
    allow read, write: if request.auth != null
      && get(/databases/$(database)/documents/chats/$(conversationId)).data.userId == request.auth.uid;
  }
}
```
