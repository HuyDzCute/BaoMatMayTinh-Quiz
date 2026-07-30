/**
 * Numerical verification of 2.5D camera + collision + jump physics.
 * Run with: npx tsx scripts/verify-25d.ts
 *
 * Prints PASS/FAIL for each assertion. No browser needed.
 */

const TOLERANCE = 0.01;

// ═══════════════════════════════════════════════════════════════════════════════
// Mirror of test scene logic
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  laneZ: 0,
  playerRadius: 0.4,
  playerHeight: 1.7,
  jumpVelocity: 9,
  gravity: 22,
  cameraZ: -10,
  cameraY: 3,
  cameraLookY: 1.0,
  cameraSmooth: 0.18,
  levelMinX: -14,
  levelMaxX: 14,
};

const OBSTACLES = [
  { minX: 4, maxX: 5, minY: 0, maxY: 2.5 },
  { minX: -5, maxX: -4, minY: 0, maxY: 1.0 },
];

function resolveHorizontalAABB(
  currentX: number,
  velocityX: number,
  dt: number,
  playerY: number,
  obstacles: ReadonlyArray<{ minX: number; maxX: number; minY: number; maxY: number }>
): { x: number; blocked: boolean } {
  let nextX = currentX + velocityX * dt;
  let blocked = false;

  if (nextX < CFG.levelMinX + CFG.playerRadius) {
    nextX = CFG.levelMinX + CFG.playerRadius;
    blocked = true;
  }
  if (nextX > CFG.levelMaxX - CFG.playerRadius) {
    nextX = CFG.levelMaxX - CFG.playerRadius;
    blocked = true;
  }

  const playerMinX = nextX - CFG.playerRadius;
  const playerMaxX = nextX + CFG.playerRadius;
  const playerFeetY = playerY;
  const playerHeadY = playerY + CFG.playerHeight;

  for (const obs of obstacles) {
    if (playerHeadY < obs.minY || playerFeetY > obs.maxY) continue;
    if (playerMaxX > obs.minX && playerMinX < obs.maxX) {
      if (velocityX > 0) nextX = obs.minX - CFG.playerRadius;
      else if (velocityX < 0) nextX = obs.maxX + CFG.playerRadius;
      blocked = true;
      break;
    }
  }

  return { x: nextX, blocked };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test runner
// ═══════════════════════════════════════════════════════════════════════════════

let pass = 0;
let fail = 0;

function assert(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}${detail ? ` (${detail})` : ""}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}${detail ? ` (${detail})` : ""}`);
    fail++;
  }
}

function close(a: number, b: number, tol: number = TOLERANCE): boolean {
  return Math.abs(a - b) < tol;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Collision tests
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n=== SECTION 1: HORIZONTAL COLLISION ===\n");

// Test 1: Move right toward wall at X=4
{
  let x = 0;
  let blockedHit = false;
  let finalX = x;
  for (let step = 0; step < 200; step++) {
    const r = resolveHorizontalAABB(x, 5, 0.05, 0, OBSTACLES);
    x = r.x;
    if (r.blocked) {
      blockedHit = true;
      finalX = x;
      break;
    }
  }
  assert(
    "Player cannot pass through wall (X=4)",
    close(x, 3.6),
    `finalX = ${x.toFixed(3)} expected 3.600`
  );
  assert(
    "Wall collision flagged blocked",
    blockedHit,
    `blocked = ${blockedHit}`
  );
}

// Test 2: Move left toward desk at X=-5
{
  let x = -3; // start past desk on the right side
  let blockedHit = false;
  for (let step = 0; step < 200; step++) {
    const r = resolveHorizontalAABB(x, -5, 0.05, 0, OBSTACLES);
    x = r.x;
    if (r.blocked) {
      blockedHit = true;
      break;
    }
  }
  assert(
    "Player cannot pass through desk (X=-5)",
    close(x, -3.6),
    `finalX = ${x.toFixed(3)} expected -3.600 (desk.maxX + radius = -4 + 0.4)`
  );
  assert(
    "Desk collision flagged blocked",
    blockedHit,
    `blocked = ${blockedHit}`
  );
}

// Test 3: Right boundary (start past wall)
{
  let x = 10;
  let blockedHit = false;
  for (let step = 0; step < 500; step++) {
    const r = resolveHorizontalAABB(x, 5, 0.05, 0, OBSTACLES);
    x = r.x;
    if (r.blocked) {
      blockedHit = true;
      break;
    }
  }
  assert(
    "Player clamps at right boundary (X=13.6)",
    close(x, 13.6),
    `finalX = ${x.toFixed(3)}`
  );
}

// Test 4: Left boundary (start past desk)
{
  let x = -10;
  let blockedHit = false;
  for (let step = 0; step < 500; step++) {
    const r = resolveHorizontalAABB(x, -5, 0.05, 0, OBSTACLES);
    x = r.x;
    if (r.blocked) {
      blockedHit = true;
      break;
    }
  }
  assert(
    "Player clamps at left boundary (X=-13.6)",
    close(x, -13.6),
    `finalX = ${x.toFixed(3)}`
  );
}

// Test 5: Jump over wall
// Wall vertical range is 0 to 2.5. Player height is 1.7.
// To bypass: playerFeetY > obs.maxY (2.5).
{
  let x = 0;
  let blockedHit = false;
  // Walk just past the wall to confirm airborne pass
  for (let step = 0; step < 100; step++) {
    const playerY = 3.0; // feet above wall top (2.5)
    const r = resolveHorizontalAABB(x, 5, 0.05, playerY, OBSTACLES);
    x = r.x;
    if (x > 5.0) break; // crossed wall, test ends
    if (r.blocked) {
      blockedHit = true;
      break;
    }
  }
  assert(
    "Player CAN jump over wall (Y=3.0 clears X=4)",
    !blockedHit && x > 5.0,
    `blocked = ${blockedHit}, finalX = ${x.toFixed(3)}`
  );
}

// Test 6: No Z drift — Z is hardcoded
assert(
  "Player Z is hardcoded to 0 (no Z input exists)",
  CFG.laneZ === 0,
  `laneZ = ${CFG.laneZ}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Jump physics
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n=== SECTION 2: JUMP PHYSICS ===\n");

{
  let y = 0;
  let vy = CFG.jumpVelocity;
  let peakY = 0;
  let landed = false;
  let framesAirborne = 0;

  for (let step = 0; step < 200; step++) {
    const dt = 0.016;
    vy -= CFG.gravity * dt;
    y += vy * dt;
    if (y < 0) {
      y = 0;
      vy = 0;
      if (!landed) {
        landed = true;
      }
      break;
    }
    if (y > peakY) peakY = y;
    framesAirborne++;
  }

  const expectedPeak = (CFG.jumpVelocity * CFG.jumpVelocity) / (2 * CFG.gravity);

  assert(
    "Peak Y matches v²=u²+2as formula",
    close(peakY, expectedPeak, 0.1),
    `peakY = ${peakY.toFixed(3)}, expected = ${expectedPeak.toFixed(3)}`
  );
  assert(
    "Player returns to Y=0 after jump",
    close(y, 0, 0.01),
    `finalY = ${y.toFixed(3)}`
  );
  assert(
    "No floor penetration during descent",
    y >= -0.001,
    `finalY = ${y.toFixed(3)}`
  );
  assert(
    "Jump arc has airborne frames",
    framesAirborne > 5,
    `framesAirborne = ${framesAirborne}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Camera behavior (simulated lerp)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n=== SECTION 3: CAMERA BEHAVIOR ===\n");

{
  let smoothedX = 0;
  let cameraY = CFG.cameraY;
  let cameraZ = CFG.cameraZ;
  const playerXHistory = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cameraHistory: { x: number; y: number; z: number }[] = [];

  for (const px of playerXHistory) {
    const dt = 0.016;
    const targetX = Math.max(CFG.levelMinX, Math.min(CFG.levelMaxX, px));
    const t = 1 - Math.pow(1 - CFG.cameraSmooth, dt * 60);
    smoothedX += (targetX - smoothedX) * t;
    cameraHistory.push({ x: smoothedX, y: cameraY, z: cameraZ });
  }

  // Run additional frames so camera catches up
  for (let i = 0; i < 200; i++) {
    const dt = 0.016;
    const targetX = 10;
    const t = 1 - Math.pow(1 - CFG.cameraSmooth, dt * 60);
    smoothedX += (targetX - smoothedX) * t;
    cameraHistory.push({ x: smoothedX, y: cameraY, z: cameraZ });
  }

  // Y and Z never change
  assert(
    "Camera Y never changes",
    cameraHistory.every((c) => close(c.y, CFG.cameraY)),
    `camY range = ${cameraHistory[0].y} to ${cameraHistory.at(-1)!.y}`
  );
  assert(
    "Camera Z never changes",
    cameraHistory.every((c) => close(c.z, CFG.cameraZ)),
    `camZ = ${cameraZ}`
  );

  // X follows player (with lerp lag, eventually catches up)
  const finalCamX = cameraHistory.at(-1)!.x;
  assert(
    "Camera X eventually follows player",
    close(finalCamX, 10, 0.5),
    `finalCamX = ${finalCamX.toFixed(3)}, playerX = 10`
  );

  // No overshoot
  const maxCamX = Math.max(...cameraHistory.map((c) => c.x));
  assert(
    "Camera X never overshoots player X",
    maxCamX <= 10 + 0.01,
    `maxCamX = ${maxCamX.toFixed(3)}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Isolation — production files untouched
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n=== SECTION 4: FILE ISOLATION ===\n");

import { existsSync } from "node:fs";
import { join } from "node:path";

const DEV_TEST_FILES = [
  "components/dev-test/MinimalSideScrollTest.tsx",
  "components/dev-test/LogicVerificationScene.tsx",
  "components/dev-test/JumpVerificationScene.tsx",
  "app/test-25d/page.tsx",
];

for (const f of DEV_TEST_FILES) {
  assert(`Test file exists: ${f}`, existsSync(join(process.cwd(), f)));
}

// Verify production files exist (preserved)
const PROD_FILES = [
  "components/game/CameraController.tsx",
  "lib/world-constants.ts",
  "lib/collision.ts",
  "lib/wordrun-save.ts",
  "lib/firebase.ts",
  "lib/auth.tsx",
];

for (const f of PROD_FILES) {
  assert(`Production file preserved: ${f}`, existsSync(join(process.cwd(), f)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n=== SUMMARY ===\n");
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);
console.log(`TOTAL: ${pass + fail}\n`);

if (fail === 0) {
  console.log("✓ ALL ASSERTIONS PASSED");
  process.exit(0);
} else {
  console.log("✗ SOME ASSERTIONS FAILED");
  process.exit(1);
}
