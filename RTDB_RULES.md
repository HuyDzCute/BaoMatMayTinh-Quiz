# Realtime Database Security Rules

#

# Vào Firebase Console → Realtime Database → Tab "Rules" → Paste rules sau:

#

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "presence": { ".read": "auth != null", ".write": "auth != null" },
    "chat_rooms": { ".read": "auth != null", ".write": "auth != null" },
    "chat_typing": { ".read": "auth != null", ".write": "auth != null" },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || !data.exists())",
        "history": { ".read": "auth != null", ".write": "auth != null" }
      }
    },
    "leaderboard": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

#

# Hoặc đơn giản hơn cho DEV (KHÔNG dùng cho production):

#

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

#

# Nhấn "Publish".
