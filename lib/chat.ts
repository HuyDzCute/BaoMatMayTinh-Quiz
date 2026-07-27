"use client";

/**
 * Chat module — Firebase Realtime Database-backed realtime + localStorage fallback.
 *
 * Khi `rtdb` (Realtime DB) chưa được cấu hình → fallback sang mock store in-memory +
 * localStorage để vẫn render được UI đầy đủ trong dev. Khi paste config vào
 * `.env.local`, hàm export sẽ tự dùng RTDB onValue/once thật.
 *
 * Data schema (RTDB):
 *   chat_rooms/{roomId}                 : { name, description, type, createdBy, createdAt, members: { uid: true }, lastMessage }
 *   chat_rooms/{roomId}/messages/{msgId}: { text, senderUid, senderName, senderPhoto, type, imageUrl, parentId, reactions, seenBy, createdAt }
 *   chat_typing/{roomIdUid}             : { uid, displayName, at, expiresAt }
 */

import { useEffect, useState } from "react";
import {
  ref,
  set as rtdbSet,
  update as rtdbUpdate,
  remove as rtdbRemove,
  push as rtdbPush,
  onValue,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { rtdb, auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logger } from "@/lib/logger";

/* ──────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */

export type ChatRoomType = "group" | "ai" | "dm";

export type ChatRoom = {
  id: string;
  name: string;
  description?: string;
  type: ChatRoomType;
  createdBy: string;
  createdAt: number; // ms epoch
  members: string[]; // uids
  lastMessage?: {
    text: string;
    senderName: string;
    at: number;
    type: "text" | "image" | "ai";
  };
};

export type ChatMessage = {
  id: string;
  roomId: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderPhoto?: string | null;
  type: "text" | "image" | "ai";
  imageUrl?: string | null;
  parentId?: string | null;
  reactions: Record<string, string[]>; // emoji -> uids
  seenBy: string[]; // uids
  createdAt: number; // ms epoch
};

export type TypingUser = {
  uid: string;
  displayName: string;
  expiresAt: number;
};

export type ChatUser = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  isAnonymous?: boolean;
};

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

const LS_ROOMS = "qthtm_chat_rooms_v1";
const LS_MSGS = "qthtm_chat_msgs_v1";
const LS_RTDB_FAILED = "qthtm_rtdb_failed";

/** Đánh dấu RTDB đã fail (cache forever - chỉ clear khi user logout). */
export function markRtdbFailed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_RTDB_FAILED, "1");
  } catch {
    /* ignore */
  }
}

/** Reset flag khi user login thật. */
export function clearRtdbFailed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LS_RTDB_FAILED);
  } catch {
    /* ignore */
  }
}

/**
 * QUYẾT ĐỊNH MODE HOẠT ĐỘNG:
 * - Local mode: user là local guest HOẶC RTDB đã từng fail → dùng localStorage
 * - Cloud mode: user đã đăng nhập Firebase AND RTDB OK → dùng RTDB
 *
 * Lý do: trong dev, Firebase API key có thể bị restrict/block → fallback local
 * vẫn cho phép test toàn bộ UI/UX của chat.
 */
export function shouldUseLocal(user: ChatUser | null): boolean {
  if (!isFirebaseConfigured || !rtdb) return true;
  if (!user) return true;
  if (user.isAnonymous && user.uid.startsWith("local-")) return true;
  // Nếu RTDB đã từng fail trong session này → vẫn dùng local
  if (typeof window !== "undefined") {
    try {
      if (localStorage.getItem(LS_RTDB_FAILED) === "1") return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** ID cho room dạng deterministic: dùng cho mock; với RTDB dùng push(). */
function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Number → ms epoch; RTDB serverTimestamp đã được convert sang số khi onValue. */
function tsToMs(v: unknown): number {
  if (!v) return Date.now();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : Date.now();
  }
  return Date.now();
}

/** Strip undefined fields. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Detect Realtime DB availability (reactive)
 * ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
 * Seed rooms (only first run, no Firebase)
 * ────────────────────────────────────────────────────────────────────────── */

function seedRoomsForUser(uid: string, displayName: string): ChatRoom[] {
  return [
    {
      id: "global-lobby",
      name: "Phòng chung • Lobby",
      description: "Mọi người dùng đều ở đây. Cứ thoải mái nói chuyện.",
      type: "group",
      createdBy: "system",
      createdAt: Date.now() - 86_400_000 * 3,
      members: ["system", uid],
      lastMessage: {
        text: "Chào mừng bạn đến với phòng chat cộng đồng!",
        senderName: "Hệ thống",
        at: Date.now() - 3600_000,
        type: "text",
      },
    },
    {
      id: "study-group",
      name: "📚 Học nhóm Anh văn",
      description: "Chia sẻ tips luyện thi, IELTS, TOEIC.",
      type: "group",
      createdBy: "system",
      createdAt: Date.now() - 86_400_000 * 2,
      members: ["system", uid],
      lastMessage: {
        text: "Hôm nay có ai ôn IELTS không?",
        senderName: displayName,
        at: Date.now() - 1800_000,
        type: "text",
      },
    },
    {
      id: "ai-assistant",
      name: "🤖 AI Assistant (Gemini)",
      description: "Hỏi gì cũng được, Gemini sẽ trả lời.",
      type: "ai",
      createdBy: "system",
      createdAt: Date.now() - 86_400_000,
      members: ["system", uid],
      lastMessage: undefined,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Local-storage fallback store (when no Firebase)
 * ────────────────────────────────────────────────────────────────────────── */

type LSStore = {
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>;
};

function lsRead(): LSStore {
  if (typeof window === "undefined") return { rooms: [], messages: {} };
  try {
    const roomsRaw = localStorage.getItem(LS_ROOMS);
    const msgsRaw = localStorage.getItem(LS_MSGS);
    const rooms: ChatRoom[] = roomsRaw ? JSON.parse(roomsRaw) : [];
    const messages: Record<string, ChatMessage[]> = msgsRaw ? JSON.parse(msgsRaw) : {};
    return { rooms, messages };
  } catch {
    return { rooms: [], messages: {} };
  }
}

function lsWrite(store: LSStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_ROOMS, JSON.stringify(store.rooms));
    localStorage.setItem(LS_MSGS, JSON.stringify(store.messages));
  } catch {
    // ignore quota errors
  }
}

function lsEnsureSeed(uid: string, displayName: string): LSStore {
  const store = lsRead();
  if (store.rooms.length === 0) {
    store.rooms = seedRoomsForUser(uid, displayName);
    store.messages["global-lobby"] = [
      {
        id: rid("m"),
        roomId: "global-lobby",
        text: "🎉 Chào mừng bạn đến với phòng chat cộng đồng! Hãy thử gửi một tin nhắn.",
        senderUid: "system",
        senderName: "Hệ thống",
        senderPhoto: null,
        type: "text",
        reactions: {},
        seenBy: [],
        createdAt: Date.now() - 86_400_000,
      },
      {
        id: rid("m"),
        roomId: "global-lobby",
        text: "Đây là demo trong khi chờ Firebase config. Nếu bạn đã paste config, hãy refresh trang.",
        senderUid: "system",
        senderName: "Hệ thống",
        senderPhoto: null,
        type: "text",
        reactions: {},
        seenBy: [],
        createdAt: Date.now() - 3_600_000,
      },
    ];
    store.messages["study-group"] = [
      {
        id: rid("m"),
        roomId: "study-group",
        text: "Mình đang ôn IELTS, có ai cùng học không? 📚",
        senderUid: "demo-user-2",
        senderName: "Minh",
        senderPhoto: null,
        type: "text",
        reactions: { "👍": ["demo-user-3"] },
        seenBy: [],
        createdAt: Date.now() - 3_600_000 * 2,
      },
      {
        id: rid("m"),
        roomId: "study-group",
        text: "Mình chơi! Tối nay 8h nhé",
        senderUid: "demo-user-3",
        senderName: "Lan",
        senderPhoto: null,
        type: "text",
        reactions: {},
        seenBy: [],
        createdAt: Date.now() - 3_600_000 * 1.5,
      },
    ];
    lsWrite(store);
  }
  return store;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Room CRUD (RTDB)
 * ────────────────────────────────────────────────────────────────────────── */

export async function createRoom(
  user: ChatUser,
  data: { name: string; description?: string; type?: ChatRoomType },
): Promise<string> {
  const type = data.type ?? "group";

  if (!shouldUseLocal(user) && rtdb) {
    try {
      const roomListRef = ref(rtdb, "chat_rooms");
      const newRoomRef = rtdbPush(roomListRef);
      const id = newRoomRef.key!;
      await rtdbSet(newRoomRef, {
        name: data.name.trim(),
        description: data.description ?? "",
        type,
        createdBy: user.uid,
        createdAt: rtdbServerTimestamp(),
        members: { [user.uid]: true },
        lastMessage: null,
      });
      const welcomeRef = ref(rtdb, `chat_rooms/${id}/messages/welcome`);
      await rtdbSet(welcomeRef, {
        text: `👋 ${user.displayName} đã tạo phòng "${data.name}". Chào mừng mọi người!`,
        senderUid: "system",
        senderName: "Hệ thống",
        senderPhoto: null,
        type: "text",
        reactions: {},
        seenBy: {},
        createdAt: rtdbServerTimestamp(),
      });
      return id;
    } catch (err) {
      logger.warn("[chat] createRoom RTDB failed, falling back to local:", err);
      markRtdbFailed();
      // Fall through to localStorage
    }
  }
  // localStorage fallback
  const store = lsRead();
  const newRoom: ChatRoom = {
    id: rid("r"),
    name: data.name.trim(),
    description: data.description ?? "",
    type,
    createdBy: user.uid,
    createdAt: Date.now(),
    members: [user.uid],
    lastMessage: {
      text: `👋 ${user.displayName} đã tạo phòng "${data.name}". Chào mừng mọi người!`,
      senderName: "Hệ thống",
      at: Date.now(),
      type: "text",
    },
  };
  store.rooms.unshift(newRoom);
  store.messages[newRoom.id] = [
    {
      id: rid("m"),
      roomId: newRoom.id,
      text: `👋 ${user.displayName} đã tạo phòng "${data.name}". Chào mừng mọi người!`,
      senderUid: "system",
      senderName: "Hệ thống",
      senderPhoto: null,
      type: "text",
      reactions: {},
      seenBy: [],
      createdAt: Date.now(),
    },
  ];
  lsWrite(store);
  return newRoom.id;
}

export async function joinRoom(user: ChatUser, roomId: string): Promise<void> {
  if (shouldUseLocal(user)) {
    const store = lsRead();
    const r = store.rooms.find((x) => x.id === roomId);
    if (r && !r.members.includes(user.uid)) {
      r.members.push(user.uid);
      lsWrite(store);
    }
    return;
  }
  if (rtdb) {
    try {
      const memberRef = ref(rtdb, `chat_rooms/${roomId}/members/${user.uid}`);
      await rtdbSet(memberRef, true);
    } catch (err) {
      logger.warn("[chat] joinRoom RTDB failed, using local:", err);
      markRtdbFailed();
      const store = lsRead();
      const r = store.rooms.find((x) => x.id === roomId);
      if (r && !r.members.includes(user.uid)) {
        r.members.push(user.uid);
        lsWrite(store);
      }
    }
    return;
  }
  // Fallback
  const store = lsRead();
  const r = store.rooms.find((x) => x.id === roomId);
  if (r && !r.members.includes(user.uid)) {
    r.members.push(user.uid);
    lsWrite(store);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Messages: send + listen
 * ────────────────────────────────────────────────────────────────────────── */

export type SendMessageInput = {
  text: string;
  type?: "text" | "image" | "ai";
  imageUrl?: string;
  parentId?: string;
};

export async function sendMessage(
  user: ChatUser,
  roomId: string,
  input: SendMessageInput,
): Promise<string> {
  const type = input.type ?? "text";
  const now = Date.now();

  // LOCAL MODE — luôn dùng localStorage
  if (shouldUseLocal(user)) {
    const store = lsRead();
    const msg: ChatMessage = {
      id: rid("m"),
      roomId,
      text: input.text,
      senderUid: user.uid,
      senderName: user.displayName,
      senderPhoto: user.photoURL ?? null,
      type,
      imageUrl: input.imageUrl ?? null,
      parentId: input.parentId ?? null,
      reactions: {},
      seenBy: [],
      createdAt: now,
    };
    if (!store.messages[roomId]) store.messages[roomId] = [];
    store.messages[roomId].push(msg);
    const r = store.rooms.find((x) => x.id === roomId);
    if (r) {
      r.lastMessage = {
        text: type === "image" ? "📷 Hình ảnh" : input.text,
        senderName: user.displayName,
        at: msg.createdAt,
        type,
      };
    }
    lsWrite(store);
    return msg.id;
  }

  // CLOUD MODE — thử RTDB, fallback local nếu lỗi
  if (rtdb) {
    try {
      const msgsRef = ref(rtdb, `chat_rooms/${roomId}/messages`);
      const newMsgRef = rtdbPush(msgsRef);
      const msgId = newMsgRef.key!;
      const msgData = clean({
        text: input.text,
        senderUid: user.uid,
        senderName: user.displayName,
        senderPhoto: user.photoURL ?? null,
        type,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId ?? null,
        reactions: {},
        seenBy: {},
        createdAt: now,
      });
      const roomRefPath = ref(rtdb, `chat_rooms/${roomId}`);
      await rtdbUpdate(roomRefPath, {
        lastMessage: {
          text: type === "image" ? "📷 Hình ảnh" : input.text,
          senderName: user.displayName,
          at: now,
          type,
        },
      });
      await rtdbSet(newMsgRef, msgData);
      return msgId;
    } catch (err) {
      logger.warn("[chat] sendMessage RTDB failed, using local:", err);
      markRtdbFailed();
      // Fall through to localStorage
    }
  }

  // LocalStorage fallback (when RTDB unavailable or failed)
  const store = lsRead();
  const msg: ChatMessage = {
    id: rid("m"),
    roomId,
    text: input.text,
    senderUid: user.uid,
    senderName: user.displayName,
    senderPhoto: user.photoURL ?? null,
    type,
    imageUrl: input.imageUrl ?? null,
    parentId: input.parentId ?? null,
    reactions: {},
    seenBy: [],
    createdAt: now,
  };
  if (!store.messages[roomId]) store.messages[roomId] = [];
  store.messages[roomId].push(msg);
  const r = store.rooms.find((x) => x.id === roomId);
  if (r) {
    r.lastMessage = {
      text: type === "image" ? "📷 Hình ảnh" : input.text,
      senderName: user.displayName,
      at: msg.createdAt,
      type,
    };
  }
  lsWrite(store);
  return msg.id;
}

export async function deleteMessage(roomId: string, msgId: string): Promise<void> {
  // Always update local mirror first (for instant UI feedback)
  const store = lsRead();
  if (store.messages[roomId]) {
    store.messages[roomId] = store.messages[roomId].filter((m) => m.id !== msgId);
    lsWrite(store);
  }
  // Then sync to RTDB if available
  if (isFirebaseConfigured && rtdb) {
    try {
      const msgRef = ref(rtdb, `chat_rooms/${roomId}/messages/${msgId}`);
      await rtdbRemove(msgRef);
    } catch (err) {
      logger.warn("[chat] deleteMessage RTDB failed:", err);
    }
  }
}

export async function setReaction(
  roomId: string,
  msgId: string,
  uid: string,
  emoji: string,
): Promise<void> {
  // Always update local mirror first
  const store = lsRead();
  const list = store.messages[roomId];
  if (list) {
    const m = list.find((x) => x.id === msgId);
    if (m) {
      const arr = m.reactions[emoji] ?? [];
      if (arr.includes(uid)) {
        m.reactions[emoji] = arr.filter((u) => u !== uid);
        if (m.reactions[emoji].length === 0) delete m.reactions[emoji];
      } else {
        m.reactions[emoji] = [...arr, uid];
      }
      lsWrite(store);
    }
  }
  // Then sync to RTDB if available
  if (isFirebaseConfigured && rtdb) {
    try {
      const emojiSanitized = emoji.replace(/[.$#[\]/]/g, "_");
      const reactRef = ref(
        rtdb,
        `chat_rooms/${roomId}/messages/${msgId}/reactions/${emojiSanitized}/${uid}`,
      );
      const { get } = await import("firebase/database");
      const snap = await get(reactRef);
      if (snap.exists()) {
        await rtdbRemove(reactRef);
      } else {
        await rtdbSet(reactRef, true);
      }
    } catch (err) {
      logger.warn("[chat] setReaction RTDB failed:", err);
    }
  }
}

export async function markSeen(user: ChatUser, roomId: string, msgId: string): Promise<void> {
  // Local mirror first
  const store = lsRead();
  const m = store.messages[roomId]?.find((x) => x.id === msgId);
  if (m && !m.seenBy.includes(user.uid)) {
    m.seenBy.push(user.uid);
    lsWrite(store);
  }
  // RTDB sync
  if (isFirebaseConfigured && rtdb) {
    try {
      const seenRef = ref(rtdb, `chat_rooms/${roomId}/messages/${msgId}/seenBy/${user.uid}`);
      await rtdbSet(seenRef, true);
    } catch (err) {
      logger.warn("[chat] markSeen RTDB failed:", err);
    }
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Typing indicator
 * ────────────────────────────────────────────────────────────────────────── */

export async function setTyping(user: ChatUser, roomId: string, isTyping: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  // Local mirror first
  try {
    const key = `qthtm_typing_${roomId}`;
    const raw = localStorage.getItem(key);
    const list: Array<{ uid: string; displayName: string; expiresAt: number }> = raw
      ? JSON.parse(raw)
      : [];
    const filtered = list.filter((t) => t.uid !== user.uid);
    if (isTyping) {
      filtered.push({
        uid: user.uid,
        displayName: user.displayName,
        expiresAt: Date.now() + 5000,
      });
    }
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
  // RTDB sync
  if (isFirebaseConfigured && rtdb && !shouldUseLocal(user)) {
    try {
      const typingId = `${roomId}_${user.uid}`;
      const typingRef = ref(rtdb, `chat_typing/${typingId}`);
      if (isTyping) {
        await rtdbSet(typingRef, {
          uid: user.uid,
          displayName: user.displayName,
          roomId,
          at: Date.now(),
          expiresAt: Date.now() + 5000,
        });
      } else {
        await rtdbRemove(typingRef);
      }
    } catch (err) {
      logger.warn("[chat] setTyping RTDB failed:", err);
    }
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * React hooks
 * ────────────────────────────────────────────────────────────────────────── */

export function useCurrentUser(): ChatUser | null {
  const [user, setUser] = useState<ChatUser | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Bước 1: luôn khởi tạo local guest ngay để UI hoạt động
    let sid = localStorage.getItem("qthtm_anon_session_id");
    if (!sid) {
      sid = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem("qthtm_anon_session_id", sid);
    }
    const name = localStorage.getItem("qthtm_player_name") || "Bạn";
    const localGuest: ChatUser = { uid: sid, displayName: name, photoURL: null, isAnonymous: true };
    setUser(localGuest);

    // Bước 2: nếu Firebase configured, thử upgrade lên user thật (không bắt buộc)
    if (isFirebaseConfigured && auth) {
      try {
        const unsub = onAuthStateChanged(auth, (u2) => {
          if (u2) {
            // User thật → reset RTDB failed flag
            clearRtdbFailed();
            setUser({
              uid: u2.uid,
              displayName: u2.displayName || name,
              photoURL: u2.photoURL,
              isAnonymous: u2.isAnonymous,
            });
          }
          // Nếu u2 null → giữ localGuest (đã set ở bước 1)
        });
        return unsub;
      } catch {
        // Firebase lỗi → giữ localGuest
        markRtdbFailed();
      }
    }
    return () => {};
  }, []);
  return user;
}

export function useRooms(user: ChatUser | null): ChatRoom[] {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      return;
    }

    // LOCAL MODE → chỉ dùng localStorage, không gọi RTDB
    if (shouldUseLocal(user)) {
      const store = lsEnsureSeed(user.uid, user.displayName);
      setRooms(store.rooms);

      // Listen for storage events (sync giữa các tab)
      const onStorage = (e: StorageEvent) => {
        if (e.key === LS_ROOMS) {
          const s = lsRead();
          setRooms(s.rooms);
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    // CLOUD MODE: dùng localStorage cache + RTDB realtime
    if (!rtdb) return;

    const syncLocal = (list: ChatRoom[]) => {
      try {
        const local = lsRead();
        local.rooms = list;
        lsWrite(local);
      } catch {
        /* ignore */
      }
      setRooms(list);
    };

    const store = lsRead();
    if (store.rooms.length > 0) setRooms(store.rooms);

    const db = rtdb;
    const roomsRef = ref(db, "chat_rooms");
    const unsub = onValue(
      roomsRef,
      (snap) => {
        const data = snap.val();
        if (!data) {
          syncLocal([]);
          return;
        }
        const list: ChatRoom[] = [];
        for (const [id, value] of Object.entries(data)) {
          const v = value as Record<string, unknown>;
          const membersMap = (v.members as Record<string, boolean> | undefined) ?? {};
          if (!membersMap[user.uid]) continue;
          list.push({
            id,
            name: String(v.name ?? ""),
            description: (v.description as string) ?? "",
            type: (v.type as ChatRoomType) ?? "group",
            createdBy: String(v.createdBy ?? ""),
            createdAt: tsToMs(v.createdAt),
            members: Object.keys(membersMap),
            lastMessage: v.lastMessage as ChatRoom["lastMessage"],
          });
        }
        list.sort((a, b) => b.createdAt - a.createdAt);
        syncLocal(list);
      },
      (err) => {
        logger.warn("[chat] useRooms RTDB error, using local:", err);
        markRtdbFailed();
        const local = lsRead();
        setRooms(local.rooms);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  return rooms;
}

export function useMessages(roomId: string | null): ChatMessage[] {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) {
      setMsgs([]);
      return;
    }

    // Lấy user hiện tại qua localStorage (vì hook này không nhận user prop)
    const curUid =
      typeof window !== "undefined"
        ? (localStorage.getItem("qthtm_anon_session_id") ?? null)
        : null;
    const isLocalUser = curUid && curUid.startsWith("local-");

    // LOCAL MODE → chỉ dùng localStorage + lắng nghe storage events
    if (
      isLocalUser ||
      shouldUseLocal({ uid: curUid ?? "", displayName: "", isAnonymous: true }) ||
      !isFirebaseConfigured ||
      !rtdb
    ) {
      const tick = () => {
        const store = lsRead();
        const list = store.messages[roomId] ?? [];
        setMsgs(list);
      };
      tick();
      const i = setInterval(tick, 1000);

      const onStorage = (e: StorageEvent) => {
        if (e.key === LS_MSGS || e.key === LS_ROOMS) tick();
      };
      window.addEventListener("storage", onStorage);

      return () => {
        clearInterval(i);
        window.removeEventListener("storage", onStorage);
      };
    }

    // CLOUD MODE: RTDB realtime + local cache
    if (!rtdb) return;

    const store = lsRead();
    const cached = store.messages[roomId] ?? [];
    if (cached.length > 0) setMsgs(cached);

    const db = rtdb;
    const msgsRef = ref(db, `chat_rooms/${roomId}/messages`);
    const unsub = onValue(
      msgsRef,
      (snap) => {
        const data = snap.val();
        const list: ChatMessage[] = [];
        if (data) {
          for (const [id, value] of Object.entries(data)) {
            const v = value as Record<string, unknown>;
            const reactions =
              (v.reactions as Record<string, Record<string, boolean>> | undefined) ?? {};
            const flat: Record<string, string[]> = {};
            for (const [emoji, map] of Object.entries(reactions)) {
              flat[emoji] = Object.keys(map);
            }
            const seenBy = (v.seenBy as Record<string, boolean> | undefined) ?? {};
            list.push({
              id,
              roomId,
              text: String(v.text ?? ""),
              senderUid: String(v.senderUid ?? ""),
              senderName: String(v.senderName ?? ""),
              senderPhoto: (v.senderPhoto as string | null) ?? null,
              type: (v.type as ChatMessage["type"]) ?? "text",
              imageUrl: (v.imageUrl as string | null) ?? null,
              parentId: (v.parentId as string | null) ?? null,
              reactions: flat,
              seenBy: Object.keys(seenBy),
              createdAt: tsToMs(v.createdAt),
            });
          }
        }
        list.sort((a, b) => a.createdAt - b.createdAt);
        // Update local cache
        try {
          const local = lsRead();
          local.messages[roomId] = list;
          lsWrite(local);
        } catch {
          /* ignore */
        }
        setMsgs(list);
      },
      (err) => {
        logger.warn("[chat] useMessages RTDB error, using local:", err);
        markRtdbFailed();
        const local = lsRead();
        setMsgs(local.messages[roomId] ?? []);
      },
    );
    return () => unsub();
  }, [roomId]);

  return msgs;
}

/** Listen to typing users in a room. */
export function useTypingUsers(roomId: string | null): TypingUser[] {
  const [list, setList] = useState<TypingUser[]>([]);
  useEffect(() => {
    if (!roomId) {
      setList([]);
      return;
    }

    // LOCAL MODE: poll localStorage
    const curUid =
      typeof window !== "undefined"
        ? (localStorage.getItem("qthtm_anon_session_id") ?? null)
        : null;
    const isLocalUser = curUid && curUid.startsWith("local-");

    if (
      isLocalUser ||
      shouldUseLocal({ uid: curUid ?? "", displayName: "", isAnonymous: true }) ||
      !isFirebaseConfigured ||
      !rtdb
    ) {
      const tick = () => {
        try {
          const raw = localStorage.getItem(`qthtm_typing_${roomId}`);
          const arr: TypingUser[] = raw ? JSON.parse(raw) : [];
          setList(arr.filter((t) => t.expiresAt > Date.now()));
        } catch {
          /* ignore */
        }
      };
      tick();
      const i = setInterval(tick, 1500);
      return () => clearInterval(i);
    }

    // CLOUD MODE: RTDB
    if (!rtdb) return;
    const db = rtdb;
    const typingRef = ref(db, "chat_typing");
    const unsub = onValue(
      typingRef,
      (snap) => {
        const data = snap.val();
        if (!data) {
          setList([]);
          return;
        }
        const out: TypingUser[] = [];
        for (const [, value] of Object.entries(data)) {
          const v = value as Record<string, unknown>;
          if (v.roomId === roomId && Number(v.expiresAt) > Date.now()) {
            out.push({
              uid: String(v.uid),
              displayName: String(v.displayName),
              expiresAt: Number(v.expiresAt),
            });
          }
        }
        setList(out);
      },
      (err) => {
        logger.warn("[chat] useTypingUsers RTDB error:", err);
        markRtdbFailed();
      },
    );
    return () => unsub();
  }, [roomId]);
  return list;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Image upload (base64 inline — không cần Storage)
 * ────────────────────────────────────────────────────────────────────────── */

export async function uploadImage(_file: File): Promise<string> {
  // Đơn giản: convert sang base64 data URL. RTDB không cần Firebase Storage.
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("uploadImage chỉ chạy trên browser"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(_file);
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * AI integration (stub — keep contract for App)
 * ────────────────────────────────────────────────────────────────────────── */

export type AIRequest = {
  roomId: string;
  userMessage: string;
  history?: Array<{ role: "user" | "ai"; text: string }>;
};

export async function askAI(user: ChatUser, req: AIRequest): Promise<string> {
  const prompt = req.userMessage;
  // Use Gemini REST API if key is provided; otherwise echo placeholder.
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = "🤖 (AI demo) Bạn vừa nói: " + prompt;
    await sendMessage({ ...user, displayName: "AI Bot" }, req.roomId, {
      text: fallback,
      type: "ai",
    });
    return fallback;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );
    const json = await res.json();
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(AI không trả lời)";
    await sendMessage({ ...user, displayName: "AI Bot" }, req.roomId, {
      text: answer,
      type: "ai",
    });
    return answer;
  } catch (e) {
    const fallback = "🤖 Lỗi gọi AI: " + String(e);
    await sendMessage({ ...user, displayName: "AI Bot" }, req.roomId, {
      text: fallback,
      type: "ai",
    });
    return fallback;
  }
}
