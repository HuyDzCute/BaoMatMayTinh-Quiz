# Firestore Index Guide

Khi triển khai, Firestore có thể yêu cầu tạo composite index để query hoạt động.

## Collections cần index

### 1. leaderboard — orderBy timestamp desc

**Path:** `leaderboard`
**Query:** `orderBy("timestamp", "desc")`

Cách tạo index:

1. Mở Firebase Console → Firestore Database → Indexes
2. Click "Add Composite Index"
3. Collection: `leaderboard`
4. Fields: `timestamp` → Descending
5. Click Save

Hoặc dùng Firebase CLI, thêm vào `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "leaderboard",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Chạy: `firebase firestore:indexes:create`

### 2. users/{uid}/history — orderBy timestamp desc

**Path:** `users/{uid}/history`
**Query:** `orderBy("timestamp", "desc")`

Thêm vào `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "history",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Firestore Security Rules (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard: ai cung doc, chi authenticated moi ghi
    match /leaderboard/{entry} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Users: chi chu so huu moi doc/ghi history cua minh
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if request.auth != null;
      
      match /history/{resultId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
  }
}
```

## Triển khai

1. Tạo index trên Firebase Console
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Deploy indexes: `firebase deploy --only firestore:indexes`
