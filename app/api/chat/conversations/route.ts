/**
 * GET    /api/chat/conversations  — list conversations của user hiện tại
 * POST   /api/chat/conversations  — tạo conversation mới
 *
 * Yêu cầu header: `Authorization: Bearer <Firebase ID Token>`
 *
 * Firestore data model (chat):
 *   chats/{conversationId}
 *     - userId:        string   // uid của user (lấy từ idToken decode)
 *     - title:         string   // tiêu đề auto-gen từ message đầu
 *     - createdAt:     server timestamp
 *     - updatedAt:     server timestamp
 *     - messageCount:  number
 *
 *   chats/{conversationId}/messages/{messageId}
 *     - role:          'user' | 'model'
 *     - content:       string
 *     - createdAt:     server timestamp
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractBearer,
  getFirestoreBaseUrl,
  isServerFirebaseConfigured,
  projectPathPrefix,
} from "@/lib/firebase-server";

// --- ID Token helpers -----------------------------------------------------
//
// Firestore REST hỗ trợ 2 cách auth:
//   1) `?access_token=<idToken>` query param
//   2) `Authorization: Bearer <idToken>` header
// Chúng ta dùng cách 1 cho gọn.
// --------------------------------------------------------------------------

async function listConversations(idToken: string, uid: string) {
  const base = getFirestoreBaseUrl();
  // Structured query: where userId == uid, orderBy updatedAt desc, limit 100
  const url = `${base}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "chats" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "DESCENDING" }],
      limit: 100,
    },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Firestore runQuery ${r.status}: ${t.slice(0, 300)}`);
  }
  const json = (await r.json()) as Array<{
    document?: {
      name: string;
      fields: Record<
        string,
        { stringValue?: string; integerValue?: string; timestampValue?: string }
      >;
    };
    error?: { code: number; message: string };
  }>;
  return json
    .filter((d) => d.document)
    .map((d) => {
      const f = d.document!.fields;
      const id = d.document!.name.split("/").pop()!;
      return {
        id,
        title: f.title?.stringValue ?? "",
        messageCount: Number(f.messageCount?.integerValue ?? "0"),
        createdAt: f.createdAt?.timestampValue ?? null,
        updatedAt: f.updatedAt?.timestampValue ?? null,
      };
    });
}

async function createConversation(idToken: string, uid: string, title: string) {
  const base = getFirestoreBaseUrl();
  // Firestore auto-id: POST to collection root returns a generated document name.
  const url = `${base}/chats`;
  const body: {
    fields: Record<
      string,
      { stringValue?: string; integerValue?: string; timestampValue?: string }
    >;
  } = {
    fields: {
      userId: { stringValue: uid },
      title: { stringValue: title.slice(0, 120) },
      messageCount: { integerValue: "0" },
    },
    // Server timestamp via PATCH semantics is tricky; we use client-side timestamps
    // via the REST API as ISO strings (Firestore sẽ phân loại là timestamp).
    // For brevity, omit createdAt/updatedAt here and let the next POST to messages
    // backfill or rely on auto-server timestamps via the Admin SDK later.
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Firestore createConversation ${r.status}: ${t.slice(0, 300)}`);
  }
  const json = (await r.json()) as {
    name: string;
    fields: Record<string, { stringValue?: string }>;
  };
  return {
    id: json.name.split("/").pop()!,
    title: json.fields.title?.stringValue ?? title,
  };
}

export async function GET(req: NextRequest) {
  if (!isServerFirebaseConfigured) {
    return NextResponse.json(
      { error: "Server chưa cấu hình FIREBASE_PROJECT_ID." },
      { status: 503 },
    );
  }
  const idToken = extractBearer(req.headers.get("authorization"));
  if (!idToken) {
    return NextResponse.json({ error: "Thiếu Authorization Bearer token." }, { status: 401 });
  }
  // Lấy uid từ idToken (decode payload). Lưu ý: chỉ dùng để xác định
  // identity cho Firestore rule, không phải validate ký — Firestore sẽ tự
  // so sánh `request.auth.uid` ở rule layer. Để chắc chắn, ta vẫn cần
  // encode uid trong path của truy vấn.
  let uid = "";
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    uid = String(decoded.user_id || decoded.sub || "");
  } catch {
    return NextResponse.json({ error: "ID token không hợp lệ." }, { status: 401 });
  }
  if (!uid) {
    return NextResponse.json({ error: "Không lấy được uid từ token." }, { status: 401 });
  }

  try {
    const items = await listConversations(idToken, uid);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Không thể list conversations." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isServerFirebaseConfigured) {
    return NextResponse.json(
      { error: "Server chưa cấu hình FIREBASE_PROJECT_ID." },
      { status: 503 },
    );
  }
  const idToken = extractBearer(req.headers.get("authorization"));
  if (!idToken) {
    return NextResponse.json({ error: "Thiếu Authorization Bearer token." }, { status: 401 });
  }
  let uid = "";
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    uid = String(decoded.user_id || decoded.sub || "");
  } catch {
    return NextResponse.json({ error: "ID token không hợp lệ." }, { status: 401 });
  }
  if (!uid) {
    return NextResponse.json({ error: "Không lấy được uid từ token." }, { status: 401 });
  }

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON hợp lệ." }, { status: 400 });
  }
  const title = (body.title ?? "").trim() || "Cuộc trò chuyện mới";
  try {
    const created = await createConversation(idToken, uid, title);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Không thể tạo conversation." },
      { status: 500 },
    );
  }
}

void projectPathPrefix; // currently unused (để dành khi cần build path thủ công)
