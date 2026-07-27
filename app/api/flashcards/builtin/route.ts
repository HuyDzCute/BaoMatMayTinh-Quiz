/**
 * GET /api/flashcards/builtin — trả về danh sách built-in flashcard sets.
 *
 * Trước đây `lib/flashcards-data.ts` import toàn bộ 13 file data (~600 KB JS)
 * vào initial bundle. API route này chạy server-side nên user chỉ tải JSON
 * response khi cần, qua dynamic import trong client.
 *
 * Cache-Control: long-lived vì data built-in không thay đổi theo user.
 */

import { NextResponse } from "next/server";
import { loadBuiltinFlashcardSets } from "@/lib/flashcards-loader";
import { logger } from "@/lib/logger";

export const revalidate = 86400; // 24h

export async function GET() {
  try {
    const sets = await loadBuiltinFlashcardSets();
    return NextResponse.json(
      { sets },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    logger.error("[api/flashcards/builtin] failed:", e);
    return NextResponse.json({ error: "Failed to load built-in flashcard sets." }, { status: 500 });
  }
}
