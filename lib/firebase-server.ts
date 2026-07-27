/**
 * Server-side Firebase helpers.
 *
 * Để API routes có thể gọi Firestore mà KHÔNG cần service-account JSON
 * (sẽ làm phức tạp cho user), chúng ta dùng Firestore REST API và
 * forward `Authorization: Bearer <idToken>` từ client.
 *
 * Required env (server-side only, KHÔNG prefix NEXT_PUBLIC):
 *   - FIREBASE_PROJECT_ID          (phải có, vd: "qthtm-quiz")
 *   - GEMINI_API_KEY               (phải có, server-side only)
 *
 * Firestore REST endpoint:
 *   https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents
 *
 * Auth header (idToken do client gửi lên):
 *   Authorization: Bearer <idToken>
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

export const isServerFirebaseConfigured = Boolean(PROJECT_ID);

/** Firestore REST API base URL — fully-qualified, used for fetch calls. */
export function getFirestoreBaseUrl(): string {
  if (!PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID is not configured");
  }
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

/** Extract bearer token từ Authorization header. */
export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Quoted Firestore project path for Firestore SDK call() params: `projects/{id}/databases/...`. */
export function projectPathPrefix(): string {
  if (!PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID missing");
  return `projects/${PROJECT_ID}/databases/(default)/documents`;
}
