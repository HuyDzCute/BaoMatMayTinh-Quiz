/**
 * Feature Flag — Phase 1 Production Integration
 *
 * Read NEXT_PUBLIC_ENABLE_PHASE1_SIDESCROLL from environment.
 *
 * Default: OFF (false).
 *
 * When OFF:
 *   - `WordRunGame.tsx` mounts the legacy player + camera.
 *   - Behavior is bit-for-bit identical to the pre-Phase 1 production.
 *   - Rollback is automatic — just redeploy with the flag off (default).
 *
 * When ON:
 *   - `WordRunGame.tsx` mounts the Phase 1 adapter:
 *     - SideScrollPlayerStateMachine (X-only, validated)
 *     - <CameraController> (validated)
 *     - Simplified collision (Phase 1 area only)
 *   - Legacy ThirdPersonCamera is DISABLED.
 *   - The small validation area (X: -10 to +10) uses new collision.
 *
 * Rule: This flag is the SINGLE switch that controls Phase 1 vs legacy.
 *       Nothing else should be used to gate Phase 1 behavior.
 */

const ENV_KEY = "NEXT_PUBLIC_ENABLE_PHASE1_SIDESCROLL";

/**
 * True if Phase 1 adapter should be used in production.
 *
 * Safe to call from any client-side code. Returns false on the server
 * unless the env var is statically set at build time.
 */
export function isPhase1SideScrollEnabled(): boolean {
  const v = process.env[ENV_KEY];
  if (!v) return false;
  return v === "true" || v === "1";
}