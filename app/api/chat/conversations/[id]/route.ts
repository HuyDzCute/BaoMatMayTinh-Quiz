/**
 * DELETE /api/chat/conversations/[id] — xoá conversation + tất cả messages con.
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
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

  // 1) Verify ownership: read parent
  const parent = await fetch(`${base}/chats/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (parent.status === 404) {
    return NextResponse.json({ error: "Không tìm thấy conversation." }, { status: 404 });
  }
  if (!parent.ok) {
    const t = await parent.text();
    return NextResponse.json(
      { error: `Firestore read ${parent.status}: ${t.slice(0, 300)}` },
      { status: 500 },
    );
  }
  const pj = (await parent.json()) as {
    fields?: Record<string, { stringValue?: string; integerValue?: string }>;
  };
  if (pj.fields?.userId?.stringValue !== uid) {
    return NextResponse.json(
      { error: "Bạn không có quyền xoá conversation này." },
      { status: 403 },
    );
  }

  // 2) List & delete child messages
  const list = await fetch(`${base}/chats/${encodeURIComponent(id)}/messages`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (list.ok) {
    const lj = (await list.json()) as {
      documents?: Array<{ name: string }>;
    };
    await Promise.all(
      (lj.documents ?? []).map((d) => {
        const mid = d.name.split("/").pop()!;
        return fetch(
          `${base}/chats/${encodeURIComponent(id)}/messages/${encodeURIComponent(mid)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${idToken}` },
          },
        ).catch(() => null);
      }),
    );
  }

  // 3) Delete parent
  const del = await fetch(`${base}/chats/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!del.ok && del.status !== 404) {
    const t = await del.text();
    return NextResponse.json(
      { error: `Firestore delete ${del.status}: ${t.slice(0, 300)}` },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
