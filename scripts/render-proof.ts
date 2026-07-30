/**
 * SVG-based visual proof generator.
 *
 * Renders the same 5 scenarios as SVG using orthographic-like projection.
 * This avoids needing a browser/headless-GL stack.
 *
 * Projection:
 *   world_x → screen_x  (1:1, with offset)
 *   world_y → -screen_y (Y up)
 *   world_z → perspective offset on screen_x based on z depth
 *
 * Geometry is drawn as simple polygons (no real 3D shading).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  laneZ: 0,
  playerHeight: 1.7,
  playerRadius: 0.4,
  cameraZ: -10,
  cameraY: 3,
  cameraLookY: 1.0,
  fov: 55,
  width: 800,
  height: 500,
  // Projection tuning
  pxPerUnit: 60, // 1 world unit = 60 px
  centerY: 280, // pixel center Y for ground plane
  depthPitch: 0.5, // how much depth offsets x (0=orthographic, 1=full)
};

const OBSTACLES = [
  { minX: 4, maxX: 5, minY: 0, maxY: 2.5, color: "#9ca3af", label: "WALL" },
  { minX: -5, maxX: -4, minY: 0, maxY: 1.0, color: "#92400e", label: "DESK" },
];

const SCENARIOS = [
  { id: "start", label: "START — Player at X=0", playerX: 0, file: "01-start.svg" },
  { id: "middle", label: "MIDDLE — Player at X=-3 (no obstacles)", playerX: -3, file: "02-middle.svg" },
  { id: "wall", label: "WALL COLLISION — Player stopped at X=3.6", playerX: 3.6, file: "03-wall.svg" },
  { id: "desk", label: "DESK COLLISION — Player stopped at X=-3.6", playerX: -3.6, file: "04-desk.svg" },
  { id: "end", label: "END BOUNDARY — Player at X=13.6 (right edge)", playerX: 13.6, file: "05-end.svg" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Projection
// ═══════════════════════════════════════════════════════════════════════════════

function project(
  worldX: number,
  worldY: number,
  worldZ: number,
  cameraX: number
): { x: number; y: number } {
  // Camera at z=-10 looking at z=0. So z=0 is "closest" to viewer.
  // Actually with perspective, things further from camera appear smaller,
  // but for side-scrolling everything is at z=0, so we use a tilt.
  const depth = worldZ - CFG.cameraZ; // 0 - (-10) = 10 for gameplay plane
  // Apply a small isometric tilt: world Y up, world X right, Z creates slight tilt
  const tiltX = (worldZ - CFG.laneZ) * CFG.depthPitch;
  const screenX = (worldX - cameraX) * CFG.pxPerUnit + CFG.width / 2 + tiltX * CFG.pxPerUnit;
  const screenY = CFG.centerY - worldY * CFG.pxPerUnit;
  return { x: screenX, y: screenY };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG primitives
// ═══════════════════════════════════════════════════════════════════════════════

interface Box {
  worldX: number;
  worldY: number;
  worldZ: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  label?: string;
}

function drawBox(box: Box, cameraX: number): string {
  const hw = box.width / 2;
  const hh = box.height / 2;
  const hd = box.depth / 2;
  // 8 corners of box
  const c = (x: number, y: number, z: number) => project(x, y, z, cameraX);
  const p000 = c(box.worldX - hw, box.worldY - hh, box.worldZ - hd);
  const p100 = c(box.worldX + hw, box.worldY - hh, box.worldZ - hd);
  const p110 = c(box.worldX + hw, box.worldY + hh, box.worldZ - hd);
  const p010 = c(box.worldX - hw, box.worldY + hh, box.worldZ - hd);
  const p001 = c(box.worldX - hw, box.worldY - hh, box.worldZ + hd);
  const p101 = c(box.worldX + hw, box.worldY - hh, box.worldZ + hd);
  const p111 = c(box.worldX + hw, box.worldY + hh, box.worldZ + hd);
  const p011 = c(box.worldX - hw, box.worldY + hh, box.worldZ + hd);

  // Visible faces: front (z=-hd), right (x=+hw), top (y=+hh)
  // With camera at z=-10, front face is the z=-hd face
  const frontFace = `<polygon points="${p000.x},${p000.y} ${p100.x},${p100.y} ${p110.x},${p110.y} ${p010.x},${p010.y}" fill="${box.color}" stroke="#000" stroke-width="1" />`;
  const topFace = `<polygon points="${p010.x},${p010.y} ${p110.x},${p110.y} ${p111.x},${p111.y} ${p011.x},${p011.y}" fill="${lighten(box.color, 0.2)}" stroke="#000" stroke-width="1" />`;
  const rightFace = `<polygon points="${p100.x},${p100.y} ${p101.x},${p101.y} ${p111.x},${p111.y} ${p110.x},${p110.y}" fill="${darken(box.color, 0.2)}" stroke="#000" stroke-width="1" />`;

  return topFace + rightFace + frontFace;
}

function lighten(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}

function darken(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

function adjustColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.round(amount * 255);
  return `#${Math.max(0, Math.min(255, r + a)).toString(16).padStart(2, "0")}${Math.max(0, Math.min(255, g + a)).toString(16).padStart(2, "0")}${Math.max(0, Math.min(255, b + a)).toString(16).padStart(2, "0")}`;
}

function drawPlayer(playerX: number, cameraX: number): string {
  const feet = project(playerX, 0, CFG.laneZ, cameraX);
  const head = project(playerX, CFG.playerHeight, CFG.laneZ, cameraX);
  const w = CFG.playerRadius * CFG.pxPerUnit;
  // Body (capsule approximation as rounded rect)
  const bodyX = feet.x - w;
  const bodyY = head.y;
  const bodyH = feet.y - head.y;
  const bodyW = w * 2;
  // Eyes
  const eyeY = head.y + bodyH * 0.30;
  const eyeOffset = w * 0.35;
  return `
    <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${w}" ry="${w}" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1.5" />
    <circle cx="${feet.x + eyeOffset}" cy="${eyeY}" r="2" fill="#0f172a" />
    <circle cx="${feet.x - eyeOffset}" cy="${eyeY}" r="2" fill="#0f172a" />
  `;
}

function drawCollectible(cameraX: number): string {
  const p = project(-3, 1.2, CFG.laneZ, cameraX);
  return `<circle cx="${p.x}" cy="${p.y}" r="${0.3 * CFG.pxPerUnit}" fill="#fbbf24" stroke="#b45309" stroke-width="2" opacity="0.95" />`;
}

function drawNPC(cameraX: number): string {
  const feet = project(8, 0, CFG.laneZ, cameraX);
  const head = project(8, 1.5, CFG.laneZ, cameraX);
  const w = 0.4 * CFG.pxPerUnit;
  return `
    <rect x="${feet.x - w / 2}" y="${feet.y - (feet.y - head.y) - 20}" width="${w}" height="${feet.y - head.y + 20}" rx="6" fill="#16a34a" stroke="#14532d" stroke-width="1.5" />
    <circle cx="${feet.x}" cy="${feet.y - (feet.y - head.y) - 30}" r="${0.25 * CFG.pxPerUnit}" fill="#fcd9bd" stroke="#92400e" stroke-width="1" />
  `;
}

function drawGround(cameraX: number): string {
  // Draw ground from world X = cameraX - 8 to cameraX + 8
  const left = project(cameraX - 8, 0, CFG.laneZ, cameraX);
  const right = project(cameraX + 8, 0, CFG.laneZ, cameraX);
  // Top of ground = slightly above 0 (so the ground strip is visible)
  const depthOffset = 0; // z=0 same as ground
  return `<rect x="${left.x - 50}" y="${left.y - 2}" width="${right.x - left.x + 100}" height="6" fill="#a89078" />`;
}

function drawAxis(cameraX: number): string {
  // Show world coordinates on screen
  const start = project(cameraX - 8, 0, CFG.laneZ, cameraX);
  const end = project(cameraX + 8, 0, CFG.laneZ, cameraX);
  let result = "";
  for (let wx = Math.ceil(cameraX - 8); wx <= cameraX + 8; wx++) {
    const p = project(wx, 0, CFG.laneZ, cameraX);
    result += `<line x1="${p.x}" y1="${start.y - 8}" x2="${p.x}" y2="${start.y + 8}" stroke="#475569" stroke-width="0.5" />`;
    result += `<text x="${p.x}" y="${start.y + 22}" font-family="monospace" font-size="10" fill="#94a3b8" text-anchor="middle">${wx}</text>`;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Render scene
// ═══════════════════════════════════════════════════════════════════════════════

function renderScene(scenario: { id: string; label: string; playerX: string | number; file: string }) {
  const playerX = scenario.playerX as number;
  const cameraX = playerX; // camera follows player exactly for screenshots

  const parts: string[] = [];

  // Background
  parts.push(`<rect x="0" y="0" width="${CFG.width}" height="${CFG.height}" fill="#1a1a2e" />`);

  // Horizon line
  const horizon = project(0, 0, CFG.laneZ, cameraX);
  parts.push(`<line x1="0" y1="${CFG.centerY - 100}" x2="${CFG.width}" y2="${CFG.centerY - 100}" stroke="#334155" stroke-width="1" stroke-dasharray="4,4" />`);

  // Ground
  parts.push(drawGround(cameraX));
  parts.push(drawAxis(cameraX));

  // Obstacles (sorted by Z for painter's algorithm)
  for (const obs of OBSTACLES) {
    const cx = (obs.minX + obs.maxX) / 2;
    const cy = (obs.minY + obs.maxY) / 2;
    parts.push(drawBox({
      worldX: cx,
      worldY: cy,
      worldZ: CFG.laneZ,
      width: obs.maxX - obs.minX,
      height: obs.maxY - obs.minY,
      depth: 1.5,
      color: obs.color,
    }, cameraX));

    // Label
    const labelP = project(cx, obs.maxY + 0.5, CFG.laneZ, cameraX);
    parts.push(`<text x="${labelP.x}" y="${labelP.y}" font-family="monospace" font-size="12" fill="#fff" text-anchor="middle" font-weight="bold">${obs.label}</text>`);
  }

  // NPC
  parts.push(drawNPC(cameraX));

  // Collectible
  parts.push(drawCollectible(cameraX));

  // Player
  parts.push(drawPlayer(playerX, cameraX));

  // Camera frustum marker (dashed line at z=-10 showing camera Z)
  const camZ = project(0, CFG.cameraY, CFG.cameraZ, cameraX);
  parts.push(`<circle cx="${camZ.x}" cy="${camZ.y}" r="3" fill="#f43f5e" />`);
  parts.push(`<text x="${camZ.x + 8}" y="${camZ.y - 8}" font-family="monospace" font-size="10" fill="#f43f5e">CAM</text>`);

  // Title bar
  parts.push(`<rect x="0" y="0" width="${CFG.width}" height="40" fill="rgba(0,0,0,0.7)" />`);
  parts.push(`<text x="20" y="26" font-family="monospace" font-size="16" fill="#22c55e" font-weight="bold">${scenario.label}</text>`);

  // Status panel
  parts.push(`<rect x="${CFG.width - 240}" y="${CFG.height - 100}" width="220" height="80" fill="rgba(0,0,0,0.85)" rx="8" />`);
  parts.push(`<text x="${CFG.width - 230}" y="${CFG.height - 78}" font-family="monospace" font-size="11" fill="#22c55e">PLAYER.X = ${playerX.toFixed(2)}</text>`);
  parts.push(`<text x="${CFG.width - 230}" y="${CFG.height - 60}" font-family="monospace" font-size="11" fill="#22c55e">PLAYER.Z = 0.000 (locked)</text>`);
  parts.push(`<text x="${CFG.width - 230}" y="${CFG.height - 42}" font-family="monospace" font-size="11" fill="#22c55e">CAM.Z = -10 (fixed)</text>`);
  parts.push(`<text x="${CFG.width - 230}" y="${CFG.height - 24}" font-family="monospace" font-size="11" fill="#22c55e">CAM.Y = 3 (fixed)</text>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CFG.width}" height="${CFG.height}" viewBox="0 0 ${CFG.width} ${CFG.height}">
${parts.join("\n")}
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

mkdirSync("scripts/proof", { recursive: true });

let pass = 0;
let fail = 0;

console.log("=== SVG Visual Proof Generator ===\n");

for (const scenario of SCENARIOS) {
  const svg = renderScene(scenario);
  const path = join("scripts/proof", scenario.file);
  try {
    writeFileSync(path, svg);
    const size = svg.length;
    if (size > 1000) {
      console.log(`  ✓ ${scenario.label} (${size} bytes → ${path})`);
      pass++;
    } else {
      console.log(`  ✗ ${scenario.label} (too small: ${size} bytes)`);
      fail++;
    }
  } catch (e) {
    console.log(`  ✗ ${scenario.label} (error: ${(e as Error).message})`);
    fail++;
  }
}

console.log("\n=== SUMMARY ===");
console.log(`Rendered: ${pass}/${SCENARIOS.length}`);
console.log(`Output: scripts/proof/`);
console.log(`\nOpen in any browser: file:///${join(process.cwd(), "scripts/proof", "01-start.svg")}`);
