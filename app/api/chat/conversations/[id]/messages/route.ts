/**
 * /api/chat/conversations/[id]/messages
 *   GET  → list messages (theo updatedAt asc)
 *   POST → append message { role, content } rồi update parent updatedAt + count
 *
 * Requires `Authorization: Bearer <Firebase ID Token>`.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractBearer,
  getFirestoreBaseUrl,
  isServerFirebaseConfigured,
} from "@/lib/firebase-server";

type Ctx = { params: Promise<{ id: string }> };

async function getUidFromToken(idToken: string): Promise<string> {
  const payload = idToken.split(".")[1];
  if (!payload) throw new Error("ID token malformed");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const uid = String(decoded.user_id || decoded.sub || "");
  if (!uid) throw new Error("Không lấy được uid");
  return uid;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!isServerFirebaseConfigured) {
    return NextResponse.json(
      { error: "Server chưa cấu hình FIREBASE_PROJECT_ID." },
      { status: 503 },
    );
  }
  const idToken = extractBearer(req.headers.get("authorization"));
  if (!idToken)
    return NextResponse.json({ error: "Thiếu Authorization Bearer token." }, { status: 401 });

  let uid = "";
  try {
    uid = await getUidFromToken(idToken);
  } catch {
    return NextResponse.json({ error: "ID token không hợp lệ." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const base = getFirestoreBaseUrl();
  // List messages
  const listUrl = `${base}/chats/${encodeURIComponent(id)}/messages`;
  const r = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json(
      { error: `Firestore list ${r.status}: ${t.slice(0, 300)}` },
      { status: 500 },
    );
  }
  const json = (await r.json()) as {
    documents?: Array<{
      name: string;
      fields: Record<string, { stringValue?: string; timestampValue?: string }>;
    }>;
  };
  const items = (json.documents ?? [])
    .map((d) => {
      const f = d.fields;
      const mid = d.name.split("/").pop()!;
      const created = f.createdAt?.timestampValue;
      return {
        id: mid,
        role: f.role?.stringValue === "model" ? "model" : "user",
        content: f.content?.stringValue ?? "",
        createdAt: created ? new Date(created).getTime() : null,
        _rawCreatedAt: f.createdAt?.timestampValue, // để sort
      };
    })
    .sort((a, b) => {
      const ax = a._rawCreatedAt || "";
      const bx = b._rawCreatedAt || "";
      return ax.localeCompare(bx);
    })
    .map(({ _rawCreatedAt, ...rest }) => rest);

  return NextResponse.json({ items, uid, conversationId: id });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!isServerFirebaseConfigured) {
    return NextResponse.json(
      { error: "Server chưa cấu hình FIREBASE_PROJECT_ID." },
      { status: 503 },
    );
  }
  const idToken = extractBearer(req.headers.get("authorization"));
  if (!idToken)
    return NextResponse.json({ error: "Thiếu Authorization Bearer token." }, { status: 401 });

  let uid = "";
  try {
    uid = await getUidFromToken(idToken);
  } catch {
    return NextResponse.json({ error: "ID token không hợp lệ." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  let body: { role?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON hợp lệ." }, { status: 400 });
  }

  const role = body.role === "model" ? "model" : "user";
  const content = (body.content ?? "").toString();
  if (!content.trim()) {
    return NextResponse.json({ error: "Content không được rỗng." }, { status: 400 });
  }
  if (content.length > 8000) {
    return NextResponse.json({ error: "Content quá dài (tối đa 8000 ký tự)." }, { status: 400 });
  }

  const base = getFirestoreBaseUrl();
  // 1) Append message via auto-id
  const msgUrl = `${base}/chats/${encodeURIComponent(id)}/messages`;
  const r = await fetch(msgUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        userId: { stringValue: uid },
        role: { stringValue: role },
        content: { stringValue: content },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json(
      { error: `Firestore append ${r.status}: ${t.slice(0, 300)}` },
      { status: 500 },
    );
  }
  const appended = (await r.json()) as { name: string };
  const newId = appended.name.split("/").pop()!;

  // 2) Update parent — server-side firestore doesn't let us set serverTimestamp
  //    via REST dễ, nhưng ta có thể dùng `updateTime` ngay khi fetch hoặc
  //    đơn giản bump updatedAt với ISO string.
  const parentUrl = `${base}/chats/${encodeURIComponent(id)}`;
  await fetch(parentUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  }).catch(() => {
    /* best-effort */
  });

  // 3) Tăng messageCount bằng tay: read số hiện tại + 1
  //    (Đơn giản, không cần transaction vì chỉ best-effort.)
  try {
    const parent = await fetch(parentUrl, { headers: { Authorization: `Bearer ${idToken}` } });
    if (parent.ok) {
      const pj = (await parent.json()) as {
        fields?: Record<string, { integerValue?: string; stringValue?: string }>;
      };
      const cur = Number(pj.fields?.messageCount?.integerValue ?? "0");
      await fetch(parentUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            messageCount: { integerValue: String(cur + 1) },
          },
        }),
      });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json(
    {
      id: newId,
      role,
      content,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
