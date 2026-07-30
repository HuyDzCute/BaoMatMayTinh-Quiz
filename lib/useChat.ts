"use client";

/**
 * Hooks React cho AI Coach chat (Firestore).
 *
 * Hai trụ cột:
 *  - List conversations của user hiện tại
 *  - List messages của 1 conversation
 *
 * Cả hai đều là REST polling (5 giây/lần) thay vì Firestore SDK stream
 * — vì ta sử dụng REST API cho gọn và có thể dùng token từ client mà
 * KHÔNG cần admin credentials trên server.
 *
 * Lưu ý: SDK Firestore vẫn được dùng ở client cho auth (idToken provider).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";

export type Conversation = {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: string | null;
};

async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

type State = { items: Conversation[]; loading: boolean; error: string | null };

export function useConversations() {
  const [state, setState] = useState<State>({ items: [], loading: true, error: null });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!auth?.currentUser) {
      setState({ items: [], loading: false, error: "Chưa đăng nhập." });
      return;
    }
    try {
      const r = await authedFetch("/api/chat/conversations");
      if (!mountedRef.current) return;
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setState({ items: [], loading: false, error: j.error || `HTTP ${r.status}` });
        return;
      }
      const j = (await r.json()) as { items: Conversation[] };
      setState({ items: j.items, loading: false, error: null });
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ items: [], loading: false, error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
  }, [refresh]);

  const createConversation = useCallback(async (title?: string): Promise<Conversation | null> => {
    try {
      const r = await authedFetch("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ title: title ?? "" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { id: string; title: string };
      const conv: Conversation = {
        id: j.id,
        title: j.title,
        messageCount: 0,
        createdAt: null,
        updatedAt: null,
      };
      setState((s) => ({ ...s, items: [conv, ...s.items] }));
      return conv;
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
      return null;
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const r = await authedFetch(`/api/chat/conversations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      setState((s) => ({ ...s, items: s.items.filter((c) => c.id !== id) }));
      return true;
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
      return false;
    }
  }, []);

  return { ...state, refresh, createConversation, deleteConversation };
}

type MessagesState = { items: ChatMessage[]; loading: boolean; error: string | null };

export function useMessages(conversationId: string | null) {
  const [state, setState] = useState<MessagesState>({ items: [], loading: false, error: null });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    if (!auth?.currentUser) {
      setState({ items: [], loading: false, error: "Chưa đăng nhập." });
      return;
    }
    try {
      const r = await authedFetch(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      );
      if (!mountedRef.current) return;
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setState({ items: [], loading: false, error: j.error || `HTTP ${r.status}` });
        return;
      }
      const j = (await r.json()) as { items: ChatMessage[] };
      setState({ items: j.items, loading: false, error: null });
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ items: [], loading: false, error: (err as Error).message });
    }
  }, [conversationId]);

  useEffect(() => {
    mountedRef.current = true;
    setState({ items: [], loading: true, error: null });
    refresh();
    const t = setInterval(refresh, 4000);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
  }, [refresh]);

  const appendLocal = useCallback((msg: ChatMessage) => {
    setState((s) => ({ ...s, items: [...s.items, msg] }));
  }, []);

  const sendMessage = useCallback(
    async (role: "user" | "model", content: string): Promise<ChatMessage | null> => {
      if (!conversationId) return null;
      try {
        const r = await authedFetch(
          `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ role, content }),
          },
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${r.status}`);
        }
        const j = (await r.json()) as ChatMessage;
        const msg: ChatMessage = {
          id: j.id,
          role: j.role,
          content: j.content,
          createdAt: j.createdAt ?? new Date().toISOString(),
        };
        appendLocal(msg);
        // Nhờ refresh sau 1s để cập nhật messageCount bên conversations
        return msg;
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message }));
        return null;
      }
    },
    [conversationId, appendLocal],
  );

  return { ...state, refresh, sendMessage, appendLocal };
}

/**
 * Gọi Gemini qua server proxy. Trả về `{ text }` hoặc throw lỗi.
 */
export async function askGemini(
  messages: { role: "user" | "model"; content: string }[],
): Promise<string> {
  const r = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j.error || `Gemini HTTP ${r.status}`);
  }
  if (!j.text) throw new Error("Gemini trả về rỗng.");
  return j.text;
}
